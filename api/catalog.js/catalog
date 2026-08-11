// api/catalog.js
// GET /api/catalog — returns the current, non-prop inventory as JSON.
//
// Caching, in order of what a request hits:
//   1. CDN edge cache (Cache-Control below) — most requests never reach this function.
//   2. Redis (Upstash) — shared across all function instances, survives cold starts.
//   3. Airtable — only hit when both caches above miss or have expired.
//   4. On any Airtable failure, serve the last known-good cached copy instead of erroring.

const { fetchCatalogFromAirtable } = require('../lib/airtable');
const { getCachedCatalog, setCachedCatalog } = require('../lib/cache');

module.exports = async function handler(req, res) {
  // Tell the CDN to cache this for an hour, and to keep serving that cached
  // copy for up to a day while it revalidates in the background — visitors
  // never wait on Airtable even when the cache is technically stale.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  try {
    const cached = await getCachedCatalog();
    if (cached) {
      return res.status(200).json({ items: cached, source: 'cache' });
    }

    const items = await fetchCatalogFromAirtable();
    await setCachedCatalog(items);
    return res.status(200).json({ items, source: 'airtable' });
  } catch (err) {
    console.error('catalog handler error:', err);

    // Last resort: serve stale cache if we have anything at all, rather
    // than showing a broken storefront.
    const stale = await getCachedCatalog().catch(() => null);
    if (stale) {
      return res.status(200).json({ items: stale, source: 'stale-fallback' });
    }

    return res.status(502).json({ error: 'Unable to load catalog right now.' });
  }
};
