-- +goose Up
-- Idempotency, import batches, contact events, reports, audit logs.

CREATE TABLE idempotency_records (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope                      TEXT NOT NULL,
  key_hash                   TEXT NOT NULL,
  request_hash               TEXT NOT NULL,
  resource_type              TEXT,
  resource_public_token      TEXT,
  response_status            INT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at                 TIMESTAMPTZ NOT NULL,
  UNIQUE (scope, key_hash)
);

CREATE TABLE import_batches (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_token               TEXT UNIQUE NOT NULL,
  input_hash                 TEXT NOT NULL,
  status                     TEXT NOT NULL CHECK (status IN ('previewed', 'committing', 'committed', 'failed')),
  created_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at               TIMESTAMPTZ,
  error_note                 TEXT
);

CREATE TABLE profile_contact_events (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_brief_id             BIGINT REFERENCES buyer_briefs(id) ON DELETE SET NULL,
  event_type                 contact_event_type NOT NULL,
  session_hash               TEXT,
  referrer_url               TEXT,
  landing_url                TEXT,
  utm_source                 TEXT,
  utm_medium                 TEXT,
  utm_campaign               TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profile_reports (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_name              TEXT,
  reporter_contact           TEXT,
  reason                     TEXT NOT NULL,
  status                     TEXT NOT NULL DEFAULT 'open',
  handled_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  handled_note               TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_at                 TIMESTAMPTZ
);

CREATE TABLE admin_audit_logs (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id              BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action                     TEXT NOT NULL,
  entity_type                TEXT NOT NULL,
  entity_id                  BIGINT,
  before_data                JSONB,
  after_data                 JSONB,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS admin_audit_logs;
DROP TABLE IF EXISTS profile_reports;
DROP TABLE IF EXISTS profile_contact_events;
DROP TABLE IF EXISTS import_batches;
DROP TABLE IF EXISTS idempotency_records;
