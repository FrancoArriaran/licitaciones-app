"""SQLite schema for the normalized tenders store (prototype; Postgres later)."""
import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS tenders (
    ocid TEXT PRIMARY KEY,
    tender_id TEXT,
    title TEXT,
    description TEXT,
    buyer_name TEXT,
    buyer_ruc TEXT,
    department TEXT,
    locality TEXT,
    main_category TEXT,
    procurement_method TEXT,
    amount REAL,
    currency TEXT,
    date_published TEXT,
    enquiry_start TEXT,
    enquiry_end TEXT,
    unspsc_code TEXT,
    unspsc_segment TEXT,
    unspsc_family TEXT,
    unspsc_description TEXT,
    source_release_date TEXT
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    ocid TEXT NOT NULL REFERENCES tenders(ocid),
    url TEXT,
    format TEXT,
    document_type TEXT,
    title TEXT,
    date_published TEXT
);

CREATE INDEX IF NOT EXISTS idx_tenders_department ON tenders(department);
CREATE INDEX IF NOT EXISTS idx_tenders_category ON tenders(main_category);
CREATE INDEX IF NOT EXISTS idx_tenders_unspsc ON tenders(unspsc_segment);
CREATE INDEX IF NOT EXISTS idx_tenders_unspsc_family ON tenders(unspsc_family);
CREATE INDEX IF NOT EXISTS idx_tenders_date_published ON tenders(date_published);
CREATE INDEX IF NOT EXISTS idx_documents_ocid ON documents(ocid);
"""


def connect(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    return conn
