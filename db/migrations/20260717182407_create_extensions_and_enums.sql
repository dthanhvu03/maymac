-- +goose Up
-- Extensions, hàm updated_at dùng chung, và toàn bộ enum của schema v3.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TYPE profile_kind AS ENUM (
  'factory',
  'manufacturer'
);

CREATE TYPE profile_status AS ENUM (
  'draft',
  'published',
  'temporarily_closed',
  'archived'
);

CREATE TYPE production_model AS ENUM (
  'cmt',
  'fob',
  'odm',
  'full_package'
);

CREATE TYPE verification_level AS ENUM (
  'unverified',
  'contact_verified',
  'document_verified',
  'onsite_verified'
);

CREATE TYPE verification_result AS ENUM (
  'passed',
  'partial',
  'failed'
);

CREATE TYPE availability_status AS ENUM (
  'available',
  'limited',
  'nearly_full',
  'full',
  'paused',
  'unknown'
);

CREATE TYPE brief_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'needs_information',
  'qualified',
  'matching',
  'matched',
  'rejected',
  'cancelled',
  'closed'
);

CREATE TYPE match_level AS ENUM (
  'high',
  'medium',
  'low',
  'insufficient_data'
);

CREATE TYPE lead_status AS ENUM (
  'created',
  'sent',
  'viewed',
  'responded',
  'quoted',
  'sample_started',
  'won',
  'lost',
  'expired'
);

CREATE TYPE lead_lost_reason AS ENUM (
  'no_response',
  'moq_mismatch',
  'price_mismatch',
  'deadline_mismatch',
  'capacity_unavailable',
  'capability_mismatch',
  'buyer_cancelled',
  'factory_declined',
  'selected_other_factory',
  'other'
);

CREATE TYPE review_status AS ENUM (
  'pending_verification',
  'pending_moderation',
  'approved',
  'rejected'
);

CREATE TYPE review_verification_status AS ENUM (
  'unverified',
  'contact_verified',
  'engagement_verified',
  'order_verified'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'operator',
  'editor',
  'user'
);

CREATE TYPE image_kind AS ENUM (
  'product',
  'factory',
  'machine',
  'certificate',
  'other'
);

CREATE TYPE contact_event_type AS ENUM (
  'phone_click',
  'zalo_click',
  'website_click',
  'view_address',
  'buyer_brief_start',
  'buyer_brief_submit'
);

-- +goose Down
DROP TYPE IF EXISTS contact_event_type;
DROP TYPE IF EXISTS image_kind;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS review_verification_status;
DROP TYPE IF EXISTS review_status;
DROP TYPE IF EXISTS lead_lost_reason;
DROP TYPE IF EXISTS lead_status;
DROP TYPE IF EXISTS match_level;
DROP TYPE IF EXISTS brief_status;
DROP TYPE IF EXISTS availability_status;
DROP TYPE IF EXISTS verification_result;
DROP TYPE IF EXISTS verification_level;
DROP TYPE IF EXISTS production_model;
DROP TYPE IF EXISTS profile_status;
DROP TYPE IF EXISTS profile_kind;
-- +goose StatementBegin
DROP FUNCTION IF EXISTS set_updated_at();
-- +goose StatementEnd
DROP EXTENSION IF EXISTS unaccent;
DROP EXTENSION IF EXISTS pg_trgm;
