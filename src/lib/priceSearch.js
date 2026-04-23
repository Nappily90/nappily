/**
 * lib/priceSearch.js
 * ─────────────────────────────────────────────────────────────
 * Calls the Netlify AI price search agent.
 * Returns top 2 cheapest results for the given brand + size.
 */

export async function searchPrices(brand, size) {
  try {
    const response = await fetch('/.netlify/functions/search-prices', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ brand, size }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error('Price search failed:', err);
    return [];
  }
}
