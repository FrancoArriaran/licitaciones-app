"""Build a local SQLite prototype DB from the downloaded 2026 OCDS bulk file.
Proves the normalize+load path end to end before worrying about live sync."""
import gzip
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from pipeline.normalize import normalize_release
from pipeline.schema import connect

RAW_FILE = Path(
    r"C:\Users\Usuario\AppData\Local\Temp\claude\C--Users-Usuario-Documents-Licitaciones"
    r"\739d4598-d2b7-4737-ae77-07303d49a944\scratchpad\seace_raw\2026.jsonl.gz"
)
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "tenders.db"

TENDER_COLS = [
    "ocid", "tender_id", "title", "description", "buyer_name", "buyer_ruc",
    "department", "locality", "main_category", "procurement_method", "amount",
    "currency", "date_published", "enquiry_start", "enquiry_end",
    "unspsc_code", "unspsc_segment", "unspsc_family", "unspsc_description", "source_release_date",
]
DOC_COLS = ["id", "ocid", "url", "format", "document_type", "title", "date_published"]


def main():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = connect(str(DB_PATH))
    cur = conn.cursor()

    tender_sql = f"""INSERT OR REPLACE INTO tenders ({','.join(TENDER_COLS)})
        VALUES ({','.join('?' * len(TENDER_COLS))})"""
    doc_sql = f"""INSERT OR REPLACE INTO documents ({','.join(DOC_COLS)})
        VALUES ({','.join('?' * len(DOC_COLS))})"""

    count = 0
    with gzip.open(RAW_FILE, "rt", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            release = json.loads(line)
            tender_row, doc_rows = normalize_release(release)
            if not tender_row["ocid"]:
                continue
            cur.execute(tender_sql, [tender_row[c] for c in TENDER_COLS])
            for d in doc_rows:
                if d.get("id"):
                    cur.execute(doc_sql, [d[c] for c in DOC_COLS])
            count += 1
            if count % 25000 == 0:
                conn.commit()
                print(f"...{count} procesos cargados")

    conn.commit()
    print(f"\nListo. {count} procesos cargados en {DB_PATH}")

    cur.execute("SELECT COUNT(*) FROM tenders")
    print("tenders:", cur.fetchone()[0])
    cur.execute("SELECT COUNT(*) FROM documents")
    print("documents:", cur.fetchone()[0])

    print("\nEjemplo (ultimas 3 por fecha de publicacion):")
    cur.execute("""SELECT department, main_category, procurement_method, amount, title
                   FROM tenders ORDER BY date_published DESC LIMIT 3""")
    for row in cur.fetchall():
        print(" -", row)

    conn.close()


if __name__ == "__main__":
    main()
