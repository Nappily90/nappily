/**
 * netlify/functions/search-deals.js
 * ─────────────────────────────────────────────────────────────
 * Returns best nappy deals by querying Claude for price knowledge
 * with a strict JSON-only instruction. Falls back to search URLs.
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
  if (r.includes('amazon')) return addAmazonTag(url);
  if (r.includes('boots'))  return addAwinTag(url, 'boots');
  if (r.includes('asda'))   return addAwinTag(url, 'asda');
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

function buildFallback(brand, size) {
  console.log('Using search URL fallback');
  return [
    {
      retailer:      'Amazon',
      pack:          `${brand} nappies size ${size}`,
      size:          `Size ${size}`,
      count:         null,
      total:         null,
      pricePerNappy: null,
      url:           addAffiliateTag(searchUrl('Amazon', brand, size), 'Amazon'),
      isSearchLink:  true,
    },
    {
      retailer:      'Boots',
      pack:          `${brand} nappies size ${size}`,
      size:          `Size ${size}`,
      count:         null,
      total:         null,
      pricePerNappy: null,
      url:           addAffiliateTag(searchUrl('Boots', brand, size), 'Boots'),
      isSearchLink:  true,
    },
  ];
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
      body: JSON.stringify({ deals: buildFallback(brand, size), source: 'fallback' }),
    };
  }

  try {
    // Use claude-sonnet which has better instruction following
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':    'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-5-20251022',
        max_tokens: 800,
        tools: [{
          type:     'web_search_20250305',
          name:     'web_search',
          max_uses: 4,
        }],
        system: 'You are a JSON API. You must ALWAYS respond with ONLY a valid JSON array starting with [ and ending with ]. Never write any text outside the JSON array.',
        messages: [{
          role:    'user',
          content: `Search for current UK retail prices for ${brand} nappies size ${size}. Check Amazon UK, Boots, Asda. Return ONLY this JSON (no other text):\n[{"retailer":"Amazon","pack":"product name","count":96,"total":22.99,"pricePerNappy":0.24,"url":"https://amazon.co.uk/..."},{"retailer":"Boots","pack":"product name","count":52,"total":15.99,"pricePerNappy":0.31,"url":"https://boots.com/..."}]`,
        }],
      }),
    });

    console.log('API status:', res.status);

    if (res.status === 429) {
      console.log('Rate limited — returning search links');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: buildFallback(brand, size), source: 'fallback' }),
      };
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('API error:', res.status, errText.slice(0, 200));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: buildFallback(brand, size), source: 'fallback' }),
      };
    }

    const data = await res.json();
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    const raw = textBlocks.map(b => b.text).join('').trim();
    console.log('Response text:', raw.slice(0, 400));

    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) {
      console.error('No JSON array found in:', raw.slice(0, 300));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: buildFallback(brand, size), source: 'fallback' }),
      };
    }

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: buildFallback(brand, size), source: 'fallback' }),
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
        url: addAffiliateTag(
          d.url && d.url.startsWith('http') ? d.url : searchUrl(d.retailer, brand, size),
          d.retailer
        ),
        isSearchLink: false,
      }));

    console.log('Live deals found:', deals.length);

    if (deals.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: buildFallback(brand, size), source: 'fallback' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deals, source: 'live' }),
    };

  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deals: buildFallback(brand, size), source: 'fallback' }),
    };
  }
};
