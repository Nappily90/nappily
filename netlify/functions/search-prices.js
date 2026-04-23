/**
 * netlify/functions/search-prices.js
 * ─────────────────────────────────────────────────────────────
 * AI price search agent using Claude with web search.
 * Called from the frontend when showing the result screen.
 *
 * POST body: { brand, size }
 * Returns: { results: [{ retailer, packSize, totalPrice, pricePerNappy, url, available }] }
 */

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { brand, size } = JSON.parse(event.body);

    if (!brand || !size) {
      return { statusCode: 400, body: JSON.stringify({ error: 'brand and size required' }) };
    }

    const prompt = `You are a price comparison agent for UK nappy retailers.

Search for the current best price for ${brand} nappies size ${size} at these UK retailers:
- Amazon UK (amazon.co.uk)
- Boots (boots.com)
- Asda (asda.com)
- Aldi UK (aldi.co.uk)
- Ocado (ocado.com)
- Deliveroo (deliveroo.co.uk)

For each retailer where the product is available, find:
1. The pack size (number of nappies)
2. The total price in GBP
3. The price per nappy (total / pack size)
4. The direct product URL

Return ONLY a JSON array with no other text, markdown, or explanation. Format exactly like this:
[
  {
    "retailer": "Amazon",
    "packSize": 84,
    "totalPrice": 22.99,
    "pricePerNappy": 0.27,
    "url": "https://www.amazon.co.uk/...",
    "available": true
  }
]

Rules:
- Only include retailers where you can find the specific product (${brand} size ${size})
- If a retailer doesn't stock this brand/size, set available: false and omit price fields
- Sort by pricePerNappy ascending (cheapest first)
- Include maximum 6 retailers
- Prices must be current UK prices in GBP
- URLs must be real direct product links`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':            'application/json',
        'x-api-key':               process.env.ANTHROPIC_API_KEY,
        'anthropic-version':       '2023-06-01',
        'anthropic-beta':          'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
        }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'AI search failed' }) };
    }

    const data = await response.json();

    // Extract text from response (may include tool use blocks)
    const textContent = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Parse JSON — strip any markdown fences if present
    const clean = textContent.replace(/```json|```/g, '').trim();
    const results = JSON.parse(clean);

    // Filter to available only and take top 2
    const available = results
      .filter(r => r.available !== false)
      .slice(0, 2);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: available }),
    };

  } catch (err) {
    console.error('search-prices error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Search failed', detail: err.message }),
    };
  }
};
