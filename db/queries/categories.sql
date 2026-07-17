-- name: ListCategories :many
SELECT id, slug, name_vi
FROM categories
WHERE is_active = true
ORDER BY sort_order, name_vi;

-- name: UpsertCategory :exec
-- Master data — idempotent theo slug. parent_id để NULL ở seed phẳng.
INSERT INTO categories (slug, name_vi, sort_order)
VALUES ($1, $2, $3)
ON CONFLICT (slug) DO UPDATE
  SET name_vi    = EXCLUDED.name_vi,
      sort_order = EXCLUDED.sort_order;
