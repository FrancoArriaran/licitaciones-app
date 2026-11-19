"""Turn one raw OCDS release (dict) into the flat rows our schema stores."""
from typing import Any


def normalize_release(release: dict[str, Any]) -> tuple[dict, list[dict]]:
    tender = release.get("tender", {})
    buyer = release.get("buyer", {})

    department = None
    locality = None
    buyer_ruc = None
    for party in release.get("parties", []):
        if "procuringEntity" in party.get("roles", []) or "buyer" in party.get("roles", []):
            addr = party.get("address", {})
            department = addr.get("department") or department
            locality = addr.get("locality") or locality
            for ident in party.get("additionalIdentifiers", []):
                if ident.get("scheme") == "PE-RUC":
                    buyer_ruc = ident.get("id")
            break

    unspsc_code = None
    unspsc_segment = None
    unspsc_family = None
    unspsc_description = None
    for item in tender.get("items", []):
        for cl in item.get("additionalClassifications", []):
            if cl.get("scheme") == "UNSPSC":
                unspsc_code = cl.get("id", "")
                unspsc_segment = unspsc_code[:2]
                unspsc_family = unspsc_code[:4]
                unspsc_description = cl.get("description")
                break
        if unspsc_code:
            break

    value = tender.get("value", {})
    enquiry = tender.get("enquiryPeriod", {})

    tender_row = {
        "ocid": release.get("ocid"),
        "tender_id": tender.get("id"),
        "title": tender.get("title"),
        "description": tender.get("description"),
        "buyer_name": buyer.get("name"),
        "buyer_ruc": buyer_ruc,
        "department": department,
        "locality": locality,
        "main_category": tender.get("mainProcurementCategory"),
        "procurement_method": tender.get("procurementMethodDetails"),
        "amount": value.get("amount"),
        "currency": value.get("currency"),
        "date_published": tender.get("datePublished"),
        "enquiry_start": enquiry.get("startDate"),
        "enquiry_end": enquiry.get("endDate"),
        "unspsc_code": unspsc_code,
        "unspsc_segment": unspsc_segment,
        "unspsc_family": unspsc_family,
        "unspsc_description": unspsc_description,
        "source_release_date": release.get("date"),
    }

    document_rows = []
    for doc in tender.get("documents", []):
        document_rows.append({
            "id": doc.get("id"),
            "ocid": release.get("ocid"),
            "url": doc.get("url"),
            "format": doc.get("format"),
            "document_type": doc.get("documentType"),
            "title": doc.get("title"),
            "date_published": doc.get("datePublished"),
        })

    return tender_row, document_rows
