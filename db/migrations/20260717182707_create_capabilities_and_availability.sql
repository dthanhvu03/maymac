-- +goose Up
-- Năng lực (tương đối ổn định) + availability (động, có hạn hiệu lực) + view current.

CREATE TABLE profile_capabilities (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id                BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  production_model           production_model NOT NULL,

  usual_min_order_qty        INT,
  usual_max_order_qty        INT,
  estimated_monthly_capacity_min INT,
  estimated_monthly_capacity_max INT,

  sample_supported           BOOLEAN NOT NULL DEFAULT false,
  usual_sample_lead_days_min INT,
  usual_sample_lead_days_max INT,
  usual_production_lead_days_min INT,
  usual_production_lead_days_max INT,

  materials_note             TEXT,
  machinery_note             TEXT,
  capability_note            TEXT,

  capability_verified_at     TIMESTAMPTZ,
  capability_source          TEXT,

  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (profile_id, category_id, production_model),
  CHECK (usual_min_order_qty IS NULL OR usual_min_order_qty >= 0),
  CHECK (
    usual_max_order_qty IS NULL
    OR usual_min_order_qty IS NULL
    OR usual_max_order_qty >= usual_min_order_qty
  )
);

CREATE INDEX idx_capabilities_filter
  ON profile_capabilities (
    category_id,
    production_model,
    sample_supported,
    usual_min_order_qty,
    profile_id
  );

CREATE INDEX idx_capabilities_profile
  ON profile_capabilities (profile_id, category_id, production_model);

CREATE TABLE capability_availability (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_capability_id      BIGINT NOT NULL REFERENCES profile_capabilities(id) ON DELETE CASCADE,

  status                     availability_status NOT NULL DEFAULT 'unknown',
  earliest_sample_date       DATE,
  earliest_production_date   DATE,

  capacity_30_days_min       INT,
  capacity_30_days_max       INT,
  capacity_60_days_min       INT,
  capacity_60_days_max       INT,

  source                     TEXT NOT NULL,
  confirmed_by               BIGINT REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at               TIMESTAMPTZ NOT NULL,
  valid_until                TIMESTAMPTZ NOT NULL,
  note                       TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (valid_until > confirmed_at),
  CHECK (capacity_30_days_min IS NULL OR capacity_30_days_min >= 0),
  CHECK (capacity_60_days_min IS NULL OR capacity_60_days_min >= 0)
);

CREATE INDEX idx_availability_current
  ON capability_availability (
    profile_capability_id,
    valid_until DESC,
    confirmed_at DESC
  );

CREATE VIEW current_capability_availability AS
SELECT DISTINCT ON (profile_capability_id)
  id,
  profile_capability_id,
  status,
  earliest_sample_date,
  earliest_production_date,
  capacity_30_days_min,
  capacity_30_days_max,
  capacity_60_days_min,
  capacity_60_days_max,
  source,
  confirmed_by,
  confirmed_at,
  valid_until,
  note
FROM capability_availability
WHERE valid_until > now()
ORDER BY profile_capability_id, confirmed_at DESC;

CREATE TRIGGER trg_profile_capabilities_updated_at
BEFORE UPDATE ON profile_capabilities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP VIEW IF EXISTS current_capability_availability;
DROP TABLE IF EXISTS capability_availability;
DROP TABLE IF EXISTS profile_capabilities;
