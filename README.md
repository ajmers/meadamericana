# Mead Americana — catalog backend

Small backend that sits between the website and Airtable, so the site never
calls Airtable directly (which would expose your API key) and rarely calls
it at all in practice, thanks to caching.

## How the caching works

```
Visitor → CDN (1hr cache) → this function → Redis cache → Airtable
                ↑ most requests stop here        ↑ most of the rest stop here
```

- **Normal browsing traffic** is served from the CDN or Redis — Airtable is
  typically hit once per hour, total, regardless of how many people visit.
- **When you edit inventory in Airtable**, an Automation calls
  `/api/revalidate`, which immediately re-fetches and re-caches — so changes
  appear on the site within seconds instead of waiting up to an hour.
- **If Airtable is ever down or rate-limited**, the site keeps serving the
  last good copy instead of breaking.

## One-time setup

### 1. Airtable API key
Create a personal access token at https://airtable.com/create/tokens with
`data.records:read` scope on the Mead Americana base. Put it in
`AIRTABLE_API_KEY`.

### 2. Upstash Redis (free)
1. Sign up at https://upstash.com (no credit card needed for the free tier).
2. Create a Redis database.
3. Copy the **REST URL** and **REST TOKEN** into `.env`.

### 3. Deploy
This is written as Vercel serverless functions (the `api/` folder is picked
up automatically). Push this to a GitHub repo and import it in Vercel, or
run `vercel` from this folder. Add the same environment variables from
`.env.example` in the Vercel project settings.

### 4. Connect Airtable → instant updates
In the Mead Americana base:
1. Go to **Automations** → **Create automation**.
2. Trigger: **When a record is updated** (table: Items). Add a second
   automation the same way for **When a record is created** and **When a
   record is deleted**, if you want deletions/additions to also push
   instantly.
3. Action: **Send a webhook**.
   - URL: `https://your-site.vercel.app/api/revalidate?secret=YOUR_REVALIDATE_SECRET`
   - Method: POST
4. Turn the automation on.

That's it — from then on, editing a record in Airtable updates the live
site within a few seconds, while normal traffic keeps hitting the cache
instead of your Airtable API limit.

## Endpoints

- `GET /api/catalog` — returns `{ items: [...], source: "cache" | "airtable" | "stale-fallback" }`
- `POST /api/revalidate?secret=...` — forces an immediate cache refresh
