// n8n Code node — "Normalize documents"
// Same input as "Normalize tenders" (the parsed monthly JSON).
// Output: one item per document row, ready for the Postgres "Upsert documents" node.

const records = $input.first().json.records || [];
const rows = [];

for (const record of records) {
  const release = record.compiledRelease;
  if (!release || !release.ocid) continue;

  const docs = (release.tender && release.tender.documents) || [];
  for (const doc of docs) {
    if (!doc.id) continue;
    rows.push({
      json: {
        id: doc.id,
        ocid: release.ocid,
        url: doc.url || null,
        format: doc.format || null,
        document_type: doc.documentType || null,
        title: doc.title || null,
        date_published: doc.datePublished || null,
      },
    });
  }
}

return rows;
