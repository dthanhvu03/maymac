-- +goose Up
-- Reviews (lớp uy tín phụ) + collections/SEO.

CREATE TABLE reviews (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id                    BIGINT REFERENCES leads(id) ON DELETE SET NULL,
  author_user_id             BIGINT REFERENCES users(id) ON DELETE SET NULL,
  author_name                TEXT NOT NULL,
  author_email               TEXT,
  author_phone               TEXT,

  rating_overall             SMALLINT CHECK (rating_overall BETWEEN 1 AND 5),
  rating_quality             SMALLINT CHECK (rating_quality BETWEEN 1 AND 5),
  rating_delivery            SMALLINT CHECK (rating_delivery BETWEEN 1 AND 5),
  rating_communication       SMALLINT CHECK (rating_communication BETWEEN 1 AND 5),
  rating_issue_handling      SMALLINT CHECK (rating_issue_handling BETWEEN 1 AND 5),

  title                      TEXT,
  body                       TEXT,
  verification_status        review_verification_status NOT NULL DEFAULT 'unverified',
  verification_method        TEXT, -- manual_call | manual_zalo | linked_lead | document
  verification_note          TEXT,
  verified_by                BIGINT REFERENCES users(id) ON DELETE SET NULL,
  verified_at                TIMESTAMPTZ,
  proof_object_key           TEXT, -- private bucket; không trả qua public API
  submission_ip_hash         TEXT, -- chống spam; không trả qua public API
  status                     review_status NOT NULL DEFAULT 'pending_verification',
  moderation_note            TEXT,
  moderated_by               BIGINT REFERENCES users(id) ON DELETE SET NULL,
  moderated_at               TIMESTAMPTZ,
  published_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_public
  ON reviews (profile_id, status, published_at DESC);

CREATE TABLE collections (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug                       TEXT UNIQUE NOT NULL,
  title                      TEXT NOT NULL,
  description                TEXT,
  selection_criteria         TEXT,
  editorial_content          TEXT,
  cover_url                  TEXT,
  province_code              TEXT REFERENCES provinces(code) ON DELETE SET NULL,
  category_id                BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  is_published               BOOLEAN NOT NULL DEFAULT false,
  published_at               TIMESTAMPTZ,
  created_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collection_items (
  collection_id              BIGINT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position                   INT NOT NULL DEFAULT 0,
  editorial_note             TEXT,
  PRIMARY KEY (collection_id, profile_id)
);

CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TABLE IF EXISTS collection_items;
DROP TABLE IF EXISTS collections;
DROP TABLE IF EXISTS reviews;
