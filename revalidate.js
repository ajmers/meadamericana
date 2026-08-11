// api/revalidate.js
// POST /api/revalidate?secret=YOUR_SECRET
//
// Wire this up to an Airtable Automation ("When a record is updated/created
// in Items") so edits show up on the site within seconds, instead of
// waiting for the 1-hour cache to expire on its own. See README.md.

const { fetchCatalogFromAirtable } = require('../lib/airtable');
const { setCachedCatalog } = require('../lib/cache');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const secret = req.query.secret || req.headers['x-revalidate-secret'];
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Re-fetch immediately and overwrite the cache, rather than just
    // deleting it — this way the very next visitor still gets a fast,
    // pre-warmed response instead of triggering the Airtable call themselves.
    const items = await fetchCatalogFromAirtable();
    await setCachedCatalog(items);
    return res.status(200).json({ ok: true, itemCount: items.length });
  } catch (err) {
    console.error('revalidate handler error:', err);
    return res.status(502).json({ error: 'Failed to refresh catalog from Airtable' });
  }
};
