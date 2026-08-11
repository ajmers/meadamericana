// lib/cache.js
// Thin wrapper around Upstash Redis's REST API. Using Redis (rather than an
// in-memory object) matters here because serverless functions don't share
// memory between invocations or cold starts — without a real shared store,
// "caching" silently stops working under real traffic.

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const CACHE_KEY = 'mead-americana:catalog';
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour — matches the CDN cache below

async function upstash(command) {
  const resp = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!resp.ok) throw new Error(`Upstash error ${resp.status}`);
  const { result } = await resp.json();
  return result;
}

async function getCachedCatalog() {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null; // Redis not configured — caller falls back to Airtable
  const raw = await upstash(['GET', CACHE_KEY]);
  return raw ? JSON.parse(raw) : null;
}

async function setCachedCatalog(items) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  await upstash(['SET', CACHE_KEY, JSON.stringify(items), 'EX', String(CACHE_TTL_SECONDS)]);
}

async function clearCachedCatalog() {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  await upstash(['DEL', CACHE_KEY]);
}

module.exports = { getCachedCatalog, setCachedCatalog, clearCachedCatalog };
