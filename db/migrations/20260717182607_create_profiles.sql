-- +goose Up
-- Profiles (hồ sơ xưởng) + bảng redirect slug bất biến.

CREATE TABLE profiles (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug                       TEXT UNIQUE NOT NULL,
  kind                       profile_kind NOT NULL,
  name                       TEXT NOT NULL,
  tagline                    TEXT,
  description                TEXT,

  province_code              TEXT NOT NULL REFERENCES provinces(code) ON DELETE RESTRICT,
  district_id                BIGINT,
  address                    TEXT,
  latitude                   NUMERIC(9,6),
  longitude                  NUMERIC(9,6),

  established_year           SMALLINT,
  worker_count               INT,
  production_line_count      INT,

  contact_name               TEXT,
  contact_phone              TEXT,
  contact_zalo               TEXT,
  contact_email              TEXT,
  website_url                TEXT,
  facebook_url               TEXT,

  verification_level         verification_level NOT NULL DEFAULT 'unverified',
  last_verified_at           TIMESTAMPTZ,

  completeness_score         SMALLINT NOT NULL DEFAULT 0
                               CHECK (completeness_score BETWEEN 0 AND 100),
  featured                   BOOLEAN NOT NULL DEFAULT false,
  status                     profile_status NOT NULL DEFAULT 'draft',
  search_text                TEXT NOT NULL DEFAULT '',

  -- Aggregates nội bộ; không bắt buộc public toàn bộ.
  response_rate              NUMERIC(5,2),
  median_response_minutes    INT,
  quote_rate                 NUMERIC(5,2),
  sample_rate                NUMERIC(5,2),
  order_rate                 NUMERIC(5,2),

  created_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  FOREIGN KEY (district_id, province_code)
    REFERENCES districts(id, province_code) ON DELETE RESTRICT,
  CHECK (worker_count IS NULL OR worker_count >= 0),
  CHECK (production_line_count IS NULL OR production_line_count >= 0),
  CHECK (response_rate IS NULL OR response_rate BETWEEN 0 AND 100),
  CHECK (quote_rate IS NULL OR quote_rate BETWEEN 0 AND 100),
  CHECK (sample_rate IS NULL OR sample_rate BETWEEN 0 AND 100),
  CHECK (order_rate IS NULL OR order_rate BETWEEN 0 AND 100)
);

CREATE INDEX idx_profiles_public
  ON profiles (status, kind, province_code, featured);

CREATE INDEX idx_profiles_search
  ON profiles USING gin (search_text gin_trgm_ops);

CREATE INDEX idx_profiles_verified
  ON profiles (status, verification_level, last_verified_at DESC);

CREATE TABLE profile_slug_redirects (
  old_slug                    TEXT PRIMARY KEY,
  profile_id                  BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TABLE IF EXISTS profile_slug_redirects;
DROP TABLE IF EXISTS profiles;
