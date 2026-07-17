-- +goose Up
-- Buyer Brief + history + items + attachments.

CREATE TABLE buyer_briefs (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_token               TEXT UNIQUE NOT NULL,
  status                     brief_status NOT NULL DEFAULT 'draft',

  buyer_name                 TEXT NOT NULL,
  buyer_phone                TEXT NOT NULL,
  buyer_zalo                 TEXT,
  buyer_email                TEXT,
  company_or_brand           TEXT,

  desired_deadline           DATE,
  production_model           production_model,
  sample_required            BOOLEAN,
  preferred_province_code    TEXT REFERENCES provinces(code) ON DELETE SET NULL,
  preferred_district_id      BIGINT,
  target_price_note          TEXT,
  general_note               TEXT,

  source                     TEXT,
  assigned_to                BIGINT REFERENCES users(id) ON DELETE SET NULL,
  submitted_at               TIMESTAMPTZ,
  reviewed_at                TIMESTAMPTZ,
  qualified_at               TIMESTAMPTZ,
  matched_at                 TIMESTAMPTZ,
  rejected_at                TIMESTAMPTZ,
  cancelled_at               TIMESTAMPTZ,
  closed_at                  TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (preferred_district_id, preferred_province_code)
    REFERENCES districts(id, province_code) ON DELETE SET NULL
);

CREATE INDEX idx_buyer_briefs_queue
  ON buyer_briefs (status, submitted_at DESC);

CREATE TABLE buyer_brief_status_history (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buyer_brief_id             BIGINT NOT NULL REFERENCES buyer_briefs(id) ON DELETE CASCADE,
  from_status                brief_status,
  to_status                  brief_status NOT NULL,
  changed_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  note                       TEXT,
  changed_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_buyer_brief_history
  ON buyer_brief_status_history (buyer_brief_id, changed_at);

CREATE TABLE buyer_brief_items (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buyer_brief_id             BIGINT NOT NULL REFERENCES buyer_briefs(id) ON DELETE CASCADE,
  category_id                BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  estimated_quantity         INT NOT NULL,
  colors_note                TEXT,
  size_breakdown_note        TEXT,
  material_note              TEXT,
  has_techpack               BOOLEAN,
  has_pattern                BOOLEAN,
  printing_note              TEXT,
  packaging_note             TEXT,
  quality_note               TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (estimated_quantity > 0)
);

CREATE TABLE buyer_brief_attachments (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buyer_brief_id             BIGINT NOT NULL REFERENCES buyer_briefs(id) ON DELETE CASCADE,
  object_key                 TEXT NOT NULL,
  original_file_name         TEXT,
  mime_type                  TEXT,
  size_bytes                 BIGINT,
  sha256                     TEXT,
  uploaded_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (size_bytes IS NULL OR size_bytes >= 0)
);

CREATE TRIGGER trg_buyer_briefs_updated_at
BEFORE UPDATE ON buyer_briefs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TABLE IF EXISTS buyer_brief_attachments;
DROP TABLE IF EXISTS buyer_brief_items;
DROP TABLE IF EXISTS buyer_brief_status_history;
DROP TABLE IF EXISTS buyer_briefs;
