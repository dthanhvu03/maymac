-- +goose Up
-- Users và master data: provinces, districts, categories.

CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT UNIQUE,
  phone         TEXT,
  name          TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'user',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE provinces (
  code          TEXT PRIMARY KEY,
  name_vi       TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL
);

CREATE TABLE districts (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  province_code TEXT NOT NULL REFERENCES provinces(code) ON DELETE RESTRICT,
  name_vi       TEXT NOT NULL,
  slug          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (province_code, slug),
  UNIQUE (id, province_code)
);

CREATE INDEX idx_districts_province
  ON districts (province_code, is_active, name_vi);

CREATE TABLE categories (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  name_vi       TEXT NOT NULL,
  parent_id     BIGINT REFERENCES categories(id) ON DELETE RESTRICT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS districts;
DROP TABLE IF EXISTS provinces;
DROP TABLE IF EXISTS users;
