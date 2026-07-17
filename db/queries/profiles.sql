-- name: UpsertProfileBySlug :one
-- Dùng cho seed demo — idempotent theo slug (slug đã publish là bất biến).
INSERT INTO profiles (slug, kind, name, tagline, province_code, status, featured)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (slug) DO UPDATE
  SET kind          = EXCLUDED.kind,
      name          = EXCLUDED.name,
      tagline       = EXCLUDED.tagline,
      province_code = EXCLUDED.province_code,
      status        = EXCLUDED.status,
      featured      = EXCLUDED.featured
RETURNING id;

-- name: ListPublishedProfiles :many
-- List công khai: chỉ profile published. Filter capability bằng semi-join EXISTS
-- (KHÔNG JOIN+DISTINCT) để phân trang/sort ổn định ở tầng profile (§12.6).
SELECT p.id, p.slug, p.kind, p.name, p.tagline,
       p.province_code, p.verification_level, p.featured
FROM profiles p
WHERE p.status = 'published'
  AND (sqlc.narg(province_code)::text IS NULL OR p.province_code = sqlc.narg(province_code)::text)
  AND (sqlc.narg(district_id)::bigint IS NULL OR p.district_id = sqlc.narg(district_id)::bigint)
  AND (
    (
      sqlc.narg(category_id)::bigint IS NULL
      AND sqlc.narg(production_model)::production_model IS NULL
      AND sqlc.narg(sample_supported)::boolean IS NULL
      AND sqlc.narg(max_moq)::int IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM profile_capabilities pc
      WHERE pc.profile_id = p.id
        AND (sqlc.narg(category_id)::bigint IS NULL OR pc.category_id = sqlc.narg(category_id)::bigint)
        AND (sqlc.narg(production_model)::production_model IS NULL OR pc.production_model = sqlc.narg(production_model)::production_model)
        AND (sqlc.narg(sample_supported)::boolean IS NULL OR pc.sample_supported = sqlc.narg(sample_supported)::boolean)
        AND (sqlc.narg(max_moq)::int IS NULL OR pc.usual_min_order_qty <= sqlc.narg(max_moq)::int)
    )
  )
ORDER BY p.featured DESC, p.id DESC
LIMIT sqlc.arg(page_size)
OFFSET sqlc.arg(page_offset);

-- name: CountPublishedProfiles :one
-- Đếm tổng cho phân trang — cùng điều kiện WHERE với ListPublishedProfiles.
SELECT count(*)
FROM profiles p
WHERE p.status = 'published'
  AND (sqlc.narg(province_code)::text IS NULL OR p.province_code = sqlc.narg(province_code)::text)
  AND (sqlc.narg(district_id)::bigint IS NULL OR p.district_id = sqlc.narg(district_id)::bigint)
  AND (
    (
      sqlc.narg(category_id)::bigint IS NULL
      AND sqlc.narg(production_model)::production_model IS NULL
      AND sqlc.narg(sample_supported)::boolean IS NULL
      AND sqlc.narg(max_moq)::int IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM profile_capabilities pc
      WHERE pc.profile_id = p.id
        AND (sqlc.narg(category_id)::bigint IS NULL OR pc.category_id = sqlc.narg(category_id)::bigint)
        AND (sqlc.narg(production_model)::production_model IS NULL OR pc.production_model = sqlc.narg(production_model)::production_model)
        AND (sqlc.narg(sample_supported)::boolean IS NULL OR pc.sample_supported = sqlc.narg(sample_supported)::boolean)
        AND (sqlc.narg(max_moq)::int IS NULL OR pc.usual_min_order_qty <= sqlc.narg(max_moq)::int)
    )
  );
