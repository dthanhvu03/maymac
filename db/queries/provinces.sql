-- name: ListProvinces :many
-- Danh sách tỉnh/thành cho filter và landing /locations/{province}.
SELECT code, name_vi, slug
FROM provinces
ORDER BY name_vi;

-- name: GetProvinceByCode :one
SELECT code, name_vi, slug
FROM provinces
WHERE code = $1;

-- name: UpsertProvince :exec
-- Dùng cho seed master data — idempotent theo khóa chính code.
INSERT INTO provinces (code, name_vi, slug)
VALUES ($1, $2, $3)
ON CONFLICT (code) DO UPDATE
  SET name_vi = EXCLUDED.name_vi,
      slug    = EXCLUDED.slug;
