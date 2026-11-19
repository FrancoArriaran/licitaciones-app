-- Baseline: the schema already running in production (created by hand from
-- legacy/db/schema.sql before migrations existed). In production this migration
-- is marked as applied without running it:
--   supabase migration repair --status applied 20261117000000


CREATE TABLE IF NOT EXISTS tenders (
    ocid                TEXT PRIMARY KEY,
    tender_id           TEXT,
    title               TEXT,
    description         TEXT,
    buyer_name          TEXT,
    buyer_ruc           TEXT,
    department          TEXT,
    locality            TEXT,
    main_category       TEXT,
    procurement_method  TEXT,
    amount              NUMERIC,
    currency            TEXT,
    date_published      TIMESTAMPTZ,
    enquiry_start       TIMESTAMPTZ,
    enquiry_end         TIMESTAMPTZ,
    unspsc_code         TEXT,
    unspsc_segment      TEXT,
    unspsc_family       TEXT,
    unspsc_description  TEXT,
    source_release_date TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
    id              TEXT PRIMARY KEY,
    ocid            TEXT NOT NULL REFERENCES tenders(ocid) ON DELETE CASCADE,
    url             TEXT,
    format          TEXT,
    document_type   TEXT,
    title           TEXT,
    date_published  TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenders_department      ON tenders(department);
CREATE INDEX IF NOT EXISTS idx_tenders_category        ON tenders(main_category);
CREATE INDEX IF NOT EXISTS idx_tenders_unspsc_family   ON tenders(unspsc_family);
CREATE INDEX IF NOT EXISTS idx_tenders_date_published  ON tenders(date_published);
CREATE INDEX IF NOT EXISTS idx_documents_ocid          ON documents(ocid);

-- Sync run log: lets n8n (and us) see at a glance whether the daily job ran
-- and how many rows it touched, without digging through n8n execution history.
CREATE TABLE IF NOT EXISTS sync_runs (
    id              SERIAL PRIMARY KEY,
    year            INT NOT NULL,
    month           INT NOT NULL,
    tenders_upserted INT NOT NULL,
    documents_upserted INT NOT NULL,
    ran_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          TEXT NOT NULL,
    error_message   TEXT
);

-- Mype client profiles. unspsc_families is derived by the LLM mapping step
-- (n8n/code_build_mapping_prompt.js + code_parse_mapping_response.js) from
-- business_description -- clients never see or choose UNSPSC codes directly.
CREATE TABLE IF NOT EXISTS mype_profiles (
    id                  SERIAL PRIMARY KEY,
    company_name        TEXT NOT NULL,
    ruc                 TEXT,
    whatsapp_phone      TEXT NOT NULL,
    departments         TEXT[] NOT NULL DEFAULT '{}',  -- empty = nacional (todas)
    business_description TEXT NOT NULL,
    unspsc_families     TEXT[] NOT NULL DEFAULT '{}',
    mapping_reasoning   TEXT,
    min_amount          NUMERIC,
    max_amount          NUMERIC,
    status              TEXT NOT NULL DEFAULT 'pending_review', -- pending_review | active | paused
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mype_profiles_status ON mype_profiles(status);
CREATE INDEX IF NOT EXISTS idx_mype_profiles_families ON mype_profiles USING GIN (unspsc_families);
CREATE INDEX IF NOT EXISTS idx_mype_profiles_departments ON mype_profiles USING GIN (departments);

-- One row per (profile, tender) match that's ever been detected. notified_at
-- stays null until the WhatsApp bot actually sends it -- that's how
-- we avoid re-notifying the same tender to the same client every day.
CREATE TABLE IF NOT EXISTS tender_matches (
    id          SERIAL PRIMARY KEY,
    profile_id  INT NOT NULL REFERENCES mype_profiles(id) ON DELETE CASCADE,
    ocid        TEXT NOT NULL REFERENCES tenders(ocid) ON DELETE CASCADE,
    matched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    notified_at TIMESTAMPTZ,
    UNIQUE (profile_id, ocid)
);

CREATE INDEX IF NOT EXISTS idx_tender_matches_pending ON tender_matches(profile_id) WHERE notified_at IS NULL;

-- Finds new matches for ACTIVE profiles only, scoped to tenders published in
-- the last N days (the daily sync only touches the current month anyway).
-- Run this after the daily upsert; ON CONFLICT means re-running is harmless.
CREATE OR REPLACE FUNCTION refresh_tender_matches(days_back INT DEFAULT 35)
RETURNS INT AS $$
DECLARE
    inserted_count INT;
BEGIN
    INSERT INTO tender_matches (profile_id, ocid)
    SELECT p.id, t.ocid
    FROM tenders t
    JOIN mype_profiles p
      ON p.status = 'active'
     AND (p.departments = '{}' OR t.department = ANY(p.departments))
     AND t.unspsc_family = ANY(p.unspsc_families)
     -- amount = 0/null usually means "not priced yet" (early-stage process),
     -- not literally free -- don't let the range filter hide those.
     AND (p.min_amount IS NULL OR t.amount IS NULL OR t.amount = 0 OR t.amount >= p.min_amount)
     AND (p.max_amount IS NULL OR t.amount IS NULL OR t.amount = 0 OR t.amount <= p.max_amount)
    WHERE t.date_published >= now() - (days_back || ' days')::interval
    ON CONFLICT (profile_id, ocid) DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;
