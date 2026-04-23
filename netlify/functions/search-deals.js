/**
 * netlify/functions/search-deals.js
 * Real-time nappy price search using Claude with web search.
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

function fallback(brand, size, reason) {
  console.log('Using fallback because:', reason);
  return [
    {
      retailer: 'Amazon',
      pack: `${brand} Size ${size}`,
      size: `Size ${size}`,
      count: 96,
      total: 24.99,
      pricePerNappy: 0.26,
      url: addAffiliateTag(searchUrl('Amazon', brand, size), 'Amazon'),
    },
    {
      retailer: 'Boots',
      pack: `${brand} Size ${size}`,
      size: `Size ${size}`,
      count: 62,
      total: 18.50,
      pricePerNappy: 0.298,
      url: addAffiliateTag(searchUrl('Boots', brand, size), 'Boots'),
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
    console.error('ANTHROPIC_API_KEY is not set');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deals: fallback(brand, size, 'no API key'), source: 'fallback' }),
    };
  }

  console.log('API key found, calling Claude...');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':    'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        tools: [{
          type:     'web_search_20250305',
          name:     'web_search',
          max_uses: 6,
        }],
        messages: [{
          role:    'user',
          content:
            `Find the current cheapest prices for ${brand} nappies size ${size} in the UK. ` +
            `Check Amazon UK, Boots, Asda, and Aldi. ` +
            `Return ONLY a JSON array of the 2 cheapest options. No markdown, no explanation. ` +
            `Format: [{"retailer":"Amazon","pack":"product name","count":96,"total":22.99,"pricePerNappy":0.239,"url":"https://..."}]`,
        }],
      }),
    });

    console.log('Claude API status:', res.status);

    const rawText = await res.text();
    console.log('Claude raw response (first 500 chars):', rawText.slice(0, 500));

    if (!res.ok) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deals: fallback(brand, size, `API error ${res.status}`),
          source: 'fallback',
          debug: rawText.slice(0, 200),
        }),
      };
    }

    const data = JSON.parse(rawText);
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    const raw = textBlocks.map(b => b.text).join('').trim();

    console.log('Extracted text:', raw.slice(0, 300));

    const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/,'').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('JSON parse failed:', e.message, 'raw:', clean.slice(0, 200));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deals: fallback(brand, size, 'JSON parse failed'),
          source: 'fallback',
          debug: clean.slice(0, 200),
        }),
      };
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deals: fallback(brand, size, 'empty result'),
          source: 'fallback',
        }),
      };
    }

    const deals = parsed
      .filter(d => d.retailer && d.total && d.count)
      .slice(0, 2)
      .map(d => ({
        retailer:      String(d.retailer),
        pack:          String(d.pack || `${brand} Size ${size}`),
        size:          `Size ${size}`,
        count:         Math.round(Number(d.count)) || 0,
        total:         Number(Number(d.total).toFixed(2)),
        pricePerNappy: Number(Number(d.pricePerNappy || (d.total / d.count)).toFixed(3)),
        url: addAffiliateTag(
          d.url && d.url.startsWith('http') ? d.url : searchUrl(d.retailer, brand, size),
          d.retailer
        ),
      }));

    console.log('Final deals:', JSON.stringify(deals));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deals, source: deals.length > 0 ? 'live' : 'fallback' }),
    };

  } catch (err) {
    console.error('Unexpected error:', err.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deals: fallback(brand, size, err.message),
        source: 'fallback',
      }),
    };
  }
};
