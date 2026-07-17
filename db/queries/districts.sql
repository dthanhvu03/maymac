-- name: UpsertDistrict :exec
-- Dùng cho seed master data — idempotent theo (province_code, slug).
INSERT INTO districts (province_code, name_vi, slug)
VALUES ($1, $2, $3)
ON CONFLICT (province_code, slug) DO UPDATE
  SET name_vi = EXCLUDED.name_vi;
