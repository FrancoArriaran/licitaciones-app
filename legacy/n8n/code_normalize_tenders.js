// n8n Code node — "Normalize tenders"
// Input: one item with the parsed monthly OCDS record-package JSON
//   ($json.records = [{ compiledRelease, ocid, releases }, ...])
// Output: one item per tender row, ready for the Postgres "Upsert tenders" node.

const records = $input.first().json.records || [];
const rows = [];

for (const record of records) {
  const release = record.compiledRelease;
  if (!release) continue;

  const tender = release.tender || {};
  const buyer = release.buyer || {};
  const parties = release.parties || [];

  let department = null, locality = null, buyerRuc = null;
  for (const party of parties) {
    const roles = party.roles || [];
    if (roles.includes("procuringEntity") || roles.includes("buyer")) {
      const addr = party.address || {};
      department = addr.department || department;
      locality = addr.locality || locality;
      for (const ident of party.additionalIdentifiers || []) {
        if (ident.scheme === "PE-RUC") buyerRuc = ident.id;
      }
      break;
    }
  }

  let unspscCode = null, unspscFamily = null, unspscSegment = null, unspscDescription = null;
  outer:
  for (const item of tender.items || []) {
    for (const cl of item.additionalClassifications || []) {
      if (cl.scheme === "UNSPSC") {
        unspscCode = cl.id || "";
        unspscSegment = unspscCode.slice(0, 2);
        unspscFamily = unspscCode.slice(0, 4);
        unspscDescription = cl.description || null;
        break outer;
      }
    }
  }

  const value = tender.value || {};
  const enquiry = tender.enquiryPeriod || {};

  if (!release.ocid) continue;

  rows.push({
    json: {
      ocid: release.ocid,
      tender_id: tender.id || null,
      title: tender.title || null,
      description: tender.description || null,
      buyer_name: buyer.name || null,
      buyer_ruc: buyerRuc,
      department: department,
      locality: locality,
      main_category: tender.mainProcurementCategory || null,
      procurement_method: tender.procurementMethodDetails || null,
      amount: value.amount ?? null,
      currency: value.currency || null,
      date_published: tender.datePublished || null,
      enquiry_start: enquiry.startDate || null,
      enquiry_end: enquiry.endDate || null,
      unspsc_code: unspscCode,
      unspsc_segment: unspscSegment,
      unspsc_family: unspscFamily,
      unspsc_description: unspscDescription,
      source_release_date: release.date || null,
    },
  });
}

return rows;
