-- +goose Up
-- Matching (brief_matches) + Lead funnel + lead history + lead outcome.

CREATE TABLE brief_matches (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buyer_brief_id             BIGINT NOT NULL REFERENCES buyer_briefs(id) ON DELETE CASCADE,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_level                match_level NOT NULL,
  reasons                    JSONB NOT NULL DEFAULT '[]'::jsonb,
  concerns                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  matched_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  matched_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  buyer_accepted             BOOLEAN,
  buyer_feedback             TEXT,
  UNIQUE (buyer_brief_id, profile_id)
);

CREATE INDEX idx_brief_matches
  ON brief_matches (buyer_brief_id, match_level, matched_at);

CREATE TABLE leads (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_token               TEXT UNIQUE NOT NULL,
  buyer_brief_id             BIGINT NOT NULL REFERENCES buyer_briefs(id) ON DELETE CASCADE,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brief_match_id             BIGINT REFERENCES brief_matches(id) ON DELETE SET NULL,

  current_status             lead_status NOT NULL DEFAULT 'created',
  sent_at                    TIMESTAMPTZ,
  viewed_at                  TIMESTAMPTZ,
  first_response_at          TIMESTAMPTZ,
  quoted_at                  TIMESTAMPTZ,
  sample_started_at          TIMESTAMPTZ,
  won_at                     TIMESTAMPTZ,
  lost_at                    TIMESTAMPTZ,
  expired_at                 TIMESTAMPTZ,

  assigned_to                BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (buyer_brief_id, profile_id)
);

CREATE INDEX idx_leads_queue
  ON leads (current_status, created_at DESC);

CREATE INDEX idx_leads_profile
  ON leads (profile_id, current_status, created_at DESC);

CREATE TABLE lead_status_history (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id                    BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_status                lead_status,
  to_status                  lead_status NOT NULL,
  changed_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  note                       TEXT,
  changed_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_history
  ON lead_status_history (lead_id, changed_at);

CREATE TABLE lead_outcomes (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id                    BIGINT UNIQUE NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  lost_reason                lead_lost_reason,
  quoted_amount_note         TEXT,
  sample_completed           BOOLEAN,
  order_confirmed            BOOLEAN,
  order_quantity             INT,
  expected_delivery_date     DATE,
  actual_delivery_date       DATE,
  delivered_on_time          BOOLEAN,
  buyer_feedback_private     TEXT,
  factory_feedback_private   TEXT,
  outcome_verified           BOOLEAN NOT NULL DEFAULT false,
  verified_by                BIGINT REFERENCES users(id) ON DELETE SET NULL,
  verified_at                TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_lead_outcomes_updated_at
BEFORE UPDATE ON lead_outcomes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TABLE IF EXISTS lead_outcomes;
DROP TABLE IF EXISTS lead_status_history;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS brief_matches;
