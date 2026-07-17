-- name: ListProvinces :many
-- Danh sách tỉnh/thành cho filter và landing /locations/{province}.
SELECT code, name_vi, slug
FROM provinces
ORDER BY name_vi;

-- name: GetProvinceByCode :one
SELECT code, name_vi, slug
FROM provinces
WHERE code = $1;
