"""One-off exploration: profile the real shape of the OECE/SEACE OCDS 2026 dataset
before designing the ingestion pipeline's schema and classifiers."""
import gzip
import json
from collections import Counter
from pathlib import Path

RAW_FILE = Path(
    r"C:\Users\Usuario\AppData\Local\Temp\claude\C--Users-Usuario-Documents-Licitaciones"
    r"\739d4598-d2b7-4737-ae77-07303d49a944\scratchpad\seace_raw\2026.jsonl.gz"
)

total = 0
categories = Counter()
methods = Counter()
departments = Counter()
doc_formats = Counter()
doc_types = Counter()
unspsc_samples = Counter()
amount_zero = 0
amount_nonzero = 0
has_documents = 0
no_documents = 0
dates_published = []

with gzip.open(RAW_FILE, "rt", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        total += 1
        release = json.loads(line)
        tender = release.get("tender", {})

        categories[tender.get("mainProcurementCategory", "?")] += 1
        methods[tender.get("procurementMethodDetails", "?")] += 1

        for party in release.get("parties", []):
            addr = party.get("address", {})
            if addr.get("department"):
                departments[addr["department"]] += 1
                break

        value = tender.get("value", {})
        amt = value.get("amount", 0) or 0
        if amt == 0:
            amount_zero += 1
        else:
            amount_nonzero += 1

        docs = tender.get("documents", [])
        if docs:
            has_documents += 1
        else:
            no_documents += 1
        for d in docs:
            doc_formats[d.get("format", "?")] += 1
            doc_types[d.get("documentType", "?")] += 1

        for item in tender.get("items", []):
            cl = item.get("additionalClassifications", [])
            for c in cl:
                if c.get("scheme") == "UNSPSC":
                    unspsc_samples[c.get("id", "")[:2]] += 1  # UNSPSC segment (2-digit)

        dp = tender.get("datePublished")
        if dp:
            dates_published.append(dp)

        if total % 200000 == 0:
            print(f"...{total} procesados")

print(f"\n=== Total de releases (procesos de contratación) en 2026: {total} ===\n")

print("-- mainProcurementCategory --")
for k, v in categories.most_common():
    print(f"  {k}: {v} ({v/total:.1%})")

print("\n-- procurementMethodDetails (top 10) --")
for k, v in methods.most_common(10):
    print(f"  {k}: {v} ({v/total:.1%})")

print("\n-- Monto (value.amount) --")
print(f"  amount == 0: {amount_zero} ({amount_zero/total:.1%})")
print(f"  amount >  0: {amount_nonzero} ({amount_nonzero/total:.1%})")

print("\n-- Documentos adjuntos --")
print(f"  con documentos: {has_documents} ({has_documents/total:.1%})")
print(f"  sin documentos: {no_documents} ({no_documents/total:.1%})")

print("\n-- Formato de documentos --")
for k, v in doc_formats.most_common():
    print(f"  {k}: {v}")

print("\n-- documentType --")
for k, v in doc_types.most_common():
    print(f"  {k}: {v}")

print("\n-- Departamentos (top 15) --")
for k, v in departments.most_common(15):
    print(f"  {k}: {v}")

print("\n-- Segmentos UNSPSC (2 primeros digitos, top 15) --")
for k, v in unspsc_samples.most_common(15):
    print(f"  {k}: {v}")

dates_published.sort()
if dates_published:
    print(f"\n-- Rango de datePublished: {dates_published[0]} .. {dates_published[-1]} --")
