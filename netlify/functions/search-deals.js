/**
 * netlify/functions/search-deals.js
 * ─────────────────────────────────────────────────────────────
 * Returns best nappy deals using Claude to reason about prices
 * from its training data, then directs users to search links.
 * 
 * Architecture: Claude gives its best known prices + direct 
 * product search URLs. This is reliable and fast.
 */

const AMAZON_TAG     = 'nappily26-21';
const AWIN_PUBLISHER = '2865911';
const AWIN_MERCHANTS = { boots: '2041', asda: '6250' };

function addAmazonTag(url) {
  if (!url || !url.includes('amazon.co.uk')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('tag', AMAZON_TAG);
    return u.toString();
  } catch {
    return url + (url.includes('?') ? '&' : '?') + `tag=${AMAZON_TAG}`;
  }
}

function addAwinTag(url, merchantKey) {
  const mid = AWIN_MERCHANTS[merchantKey];
  if (!mid || !url || url === '#') return url;
  return `https://www.awin1.com/cread.php?awinmid=${mid}&awinaffid=${AWIN_PUBLISHER}&ued=${encodeURIComponent(url)}`;
}

function addAffiliateTag(url, retailer) {
  if (!url) return '#';
  const r = retailer.toLowerCase();

  // Amazon — append associate tag to URL
  if (r.includes('amazon') || (url && url.includes('amazon.co.uk'))) {
    return addAmazonTag(url);
  }

  // Boots — wrap in Awin redirect (cookie-based tracking, 30-day window)
  if (r.includes('boots') || (url && url.includes('boots.com'))) {
    return addAwinTag(url, 'boots');
  }

  // Asda — wrap in Awin redirect
  if (r.includes('asda') || (url && url.includes('asda.com'))) {
    return addAwinTag(url, 'asda');
  }

  // All other retailers — return URL as-is (no affiliate tag)
  return url;
}

function searchUrl(retailer, brand, size) {
  const q = encodeURIComponent(`${brand} nappies size ${size}`);
  const r = retailer.toLowerCase();
  if (r.includes('amazon')) return `https://www.amazon.co.uk/s?k=${q}&i=baby`;
  if (r.includes('boots'))  return `https://www.boots.com/search?q=${encodeURIComponent(brand + ' size ' + size + ' nappies')}`;
  if (r.includes('asda'))   return `https://www.asda.com/search/${q}`;
  if (r.includes('aldi'))   return `https://www.aldi.co.uk/search?q=${q}`;
  if (r.includes('ocado'))  return `https://www.ocado.com/search?entry=${q}`;
  return `https://www.google.co.uk/search?q=${q}`;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let brand = 'Pampers';
  let size  = 3;

  try {
    const body = JSON.parse(event.body || '{}');
    brand = (body.brand && body.brand !== 'Other') ? body.brand : 'nappies';
    size  = Number(body.size) || 3;
  } catch (e) {
    console.log('Body parse error:', e.message);
  }

  console.log(`Searching for: ${brand} size ${size}`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deals: buildSearchLinks(brand, size), source: 'links' }),
    };
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system:     'You are a UK nappy price API. Respond with ONLY a JSON array. No prose. No markdown. Just the JSON array.',
        messages: [{
          role:    'user',
          content: `Give me typical current UK retail prices for ${brand} nappies size ${size}. Include Amazon UK and Boots. Use your knowledge of typical UK nappy prices from 2024-2025. Return ONLY this JSON array with no other text:\n[{"retailer":"Amazon","pack":"${brand} Size ${size} Nappies","count":96,"total":22.99,"pricePerNappy":0.239},{"retailer":"Boots","pack":"${brand} Size ${size} Nappies","count":52,"total":16.50,"pricePerNappy":0.317}]`,
        }],
      }),
    });

    console.log('API status:', res.status);

    if (!res.ok) {
      const err = await res.text();
      console.error('API error:', res.status, err.slice(0, 200));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: buildSearchLinks(brand, size), source: 'links' }),
      };
    }

    const data = await res.json();
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    const raw = textBlocks.map(b => b.text).join('').trim();
    console.log('Response:', raw.slice(0, 400));

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error('No JSON array in response');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: buildSearchLinks(brand, size), source: 'links' }),
      };
    }

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: buildSearchLinks(brand, size), source: 'links' }),
      };
    }

    const deals = parsed
      .filter(d => d.retailer && d.total && d.count)
      .slice(0, 2)
      .map(d => ({
        retailer:      String(d.retailer),
        pack:          String(d.pack || `${brand} Size ${size}`),
        size:          `Size ${size}`,
        count:         Math.round(Number(d.count)),
        total:         Number(Number(d.total).toFixed(2)),
        pricePerNappy: Number(Number(d.pricePerNappy || d.total / d.count).toFixed(3)),
        url:           addAffiliateTag(searchUrl(d.retailer, brand, size), d.retailer),
        isSearchLink:  false,
        note:          'Typical price — click to see today\'s actual price',
      }));

    console.log('Deals returned:', deals.length);

    if (deals.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: buildSearchLinks(brand, size), source: 'links' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deals, source: 'estimated' }),
    };

  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deals: buildSearchLinks(brand, size), source: 'links' }),
    };
  }
};

/**
 * Pure search links — used when we can't get any price data.
 * Shows retailer name with a "Search" link, no fake prices.
 */
function buildSearchLinks(brand, size) {
  return ['Amazon', 'Boots', 'Asda', 'Aldi'].map(retailer => ({
    retailer,
    pack:          `${brand} nappies size ${size}`,
    size:          `Size ${size}`,
    count:         null,
    total:         null,
    pricePerNappy: null,
    url:           addAffiliateTag(searchUrl(retailer, brand, size), retailer),
    isSearchLink:  true,
  }));
}
