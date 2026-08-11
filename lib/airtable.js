// lib/airtable.js
// Fetches and transforms catalog data from the Mead Americana Airtable base.
// This is the ONLY place that talks to the Airtable API.

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_ITEMS_TABLE_ID; // "Items" table
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

const FIELDS = [
  'Title',
  'Label title',
  'Label',
  'Images',
  'List price',
  'Discounted Price',
  'Sales',
  'Mark Sold',
  'Lot Number',
  'Is Prop',
  'Publish on Website',
];

/**
 * Fetches every non-prop item from Airtable, paginating as needed,
 * and maps raw Airtable fields onto the shape the website actually uses.
 */
async function fetchCatalogFromAirtable() {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID || !AIRTABLE_API_KEY) {
    throw new Error('Missing AIRTABLE_BASE_ID, AIRTABLE_ITEMS_TABLE_ID, or AIRTABLE_API_KEY env vars');
  }

  const records = [];
  let offset;

  do {
    const params = new URLSearchParams();
    FIELDS.forEach((f) => params.append('fields[]', f));
    params.set('filterByFormula', 'AND(NOT({Is Prop}), {Publish on Website})'); // exclude props and unpublished items
    params.set('pageSize', '100');
    if (offset) params.set('offset', offset);

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?${params.toString()}`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`Airtable API error ${resp.status}: ${body}`);
    }

    const data = await resp.json();
    records.push(...data.records);
    offset = data.offset; // present only if there's another page
  } while (offset);

  return records.map(mapRecord).sort((a, b) => (a.lotNumber ?? 0) - (b.lotNumber ?? 0));
}

function mapRecord(record) {
  const f = record.fields;

  const image = Array.isArray(f['Images']) && f['Images'].length > 0
    ? f['Images'][0].url
    : null;

  const sold = f['Mark Sold'] === true || (Array.isArray(f['Sales']) && f['Sales'].length > 0);

  const price = typeof f['Discounted Price'] === 'number'
    ? f['Discounted Price']
    : (typeof f['List price'] === 'number' ? f['List price'] : null);

  return {
    id: record.id,
    lotNumber: typeof f['Lot Number'] === 'number' ? f['Lot Number'] : null,
    title: f['Label title'] || f['Title'] || 'Untitled',
    description: f['Label'] || '', // rich text, returned as Markdown by the Airtable API
    image,
    price,
    sold,
    publish: f['Publish on Website'] === true,
  };
}

module.exports = { fetchCatalogFromAirtable };
