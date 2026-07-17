-- +goose Up
-- Verification records, profile data refreshes, portfolio images.

CREATE TABLE verification_records (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level                      verification_level NOT NULL,
  result                     verification_result NOT NULL,
  scope                      TEXT NOT NULL,
  method                     TEXT,
  note                       TEXT,
  service_paid               BOOLEAN NOT NULL DEFAULT false,
  verified_by                BIGINT REFERENCES users(id) ON DELETE SET NULL,
  verified_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until                TIMESTAMPTZ,
  evidence_object_key        TEXT, -- private bucket; chỉ sinh signed URL khi người có quyền truy cập
  is_public                  BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_verification_profile
  ON verification_records (profile_id, verified_at DESC);

CREATE TABLE profile_data_refreshes (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source                     TEXT NOT NULL,
  refreshed_by               BIGINT REFERENCES users(id) ON DELETE SET NULL,
  fields_refreshed           JSONB,
  note                       TEXT,
  refreshed_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profile_images (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id                BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  kind                       image_kind NOT NULL DEFAULT 'product',
  url                        TEXT NOT NULL,
  thumbnail_url              TEXT,
  caption                    TEXT,
  alt_text                   TEXT,
  sort_order                 INT NOT NULL DEFAULT 0,
  is_public                  BOOLEAN NOT NULL DEFAULT true,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_images
  ON profile_images (profile_id, category_id, is_public, sort_order);

-- +goose Down
DROP TABLE IF EXISTS profile_images;
DROP TABLE IF EXISTS profile_data_refreshes;
DROP TABLE IF EXISTS verification_records;
