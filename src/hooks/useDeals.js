/**
 * hooks/useDeals.js
 * Fetches real-time nappy deals from the AI search agent.
 * Caches results per brand+size to avoid repeat searches.
 */
import { useState, useEffect, useRef } from 'react';

export function useDeals(brand, size) {
  const [deals,   setDeals]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [source,  setSource]  = useState(null); // 'live' | 'fallback'
  const cacheRef = useRef({});

  useEffect(() => {
    if (!brand || !size) return;

    const key = `${brand}-${size}`;
    if (cacheRef.current[key]) {
      const cached = cacheRef.current[key];
      setDeals(cached.deals);
      setSource(cached.source);
      return;
    }

    setLoading(true);
    setError(null);
    setDeals(null);
    setSource(null);

    fetch('/.netlify/functions/search-deals', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ brand, size }),
    })
      .then(res => res.json())
      .then(data => {
        const result = { deals: data.deals || [], source: data.source || 'fallback' };
        cacheRef.current[key] = result;
        setDeals(result.deals);
        setSource(result.source);
        setLoading(false);
      })
      .catch(err => {
        console.error('useDeals error:', err);
        setError('Could not load prices right now.');
        setLoading(false);
      });
  }, [brand, size]);

  return { deals, loading, error, source };
}
