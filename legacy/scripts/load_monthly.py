"""Load one or more monthly OCDS record-package files (as downloaded via the
official /api/v1/file/seace_v3/json/{year}/{month} endpoint, see
scripts/fetch_monthly.py) into the local tenders.db. Each file's
record['compiledRelease'] is a plain OCDS release, same shape as the bulk
2026.jsonl.gz file build_db.py already handles, so it reuses normalize_release."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from pipeline.normalize import normalize_release
from pipeline.schema import connect

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "tenders.db"

TENDER_COLS = [
    "ocid", "tender_id", "title", "description", "buyer_name", "buyer_ruc",
    "department", "locality", "main_category", "procurement_method", "amount",
    "currency", "date_published", "enquiry_start", "enquiry_end",
    "unspsc_code", "unspsc_segment", "unspsc_family", "unspsc_description", "source_release_date",
]
DOC_COLS = ["id", "ocid", "url", "format", "document_type", "title", "date_published"]


def load_file(conn, path: Path) -> int:
    cur = conn.cursor()
    tender_sql = f"""INSERT OR REPLACE INTO tenders ({','.join(TENDER_COLS)})
        VALUES ({','.join('?' * len(TENDER_COLS))})"""
    doc_sql = f"""INSERT OR REPLACE INTO documents ({','.join(DOC_COLS)})
        VALUES ({','.join('?' * len(DOC_COLS))})"""

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    for record in data.get("records", []):
        release = record.get("compiledRelease")
        if not release:
            continue
        tender_row, doc_rows = normalize_release(release)
        if not tender_row["ocid"]:
            continue
        cur.execute(tender_sql, [tender_row[c] for c in TENDER_COLS])
        for d in doc_rows:
            if d.get("id"):
                cur.execute(doc_sql, [d[c] for c in DOC_COLS])
        count += 1

    conn.commit()
    return count


def main():
    files = sys.argv[1:] or sorted(str(p) for p in RAW_DIR.glob("*.json"))
    if not files:
        print(f"No hay archivos .json en {RAW_DIR}")
        return

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = connect(str(DB_PATH))

    for f in files:
        path = Path(f)
        n = load_file(conn, path)
        print(f"{path.name}: {n} procesos cargados/actualizados")

    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM tenders")
    print("\ntotal tenders en DB:", cur.fetchone()[0])
    cur.execute("SELECT COUNT(*) FROM documents")
    print("total documents en DB:", cur.fetchone()[0])

    conn.close()


if __name__ == "__main__":
    main()
