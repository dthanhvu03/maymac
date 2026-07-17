-- name: ListProfileCapabilities :many
-- Capabilities của một profile kèm tên category (cho trang detail).
SELECT pc.production_model,
       pc.usual_min_order_qty, pc.usual_max_order_qty,
       pc.sample_supported,
       pc.usual_sample_lead_days_min, pc.usual_sample_lead_days_max,
       pc.usual_production_lead_days_min, pc.usual_production_lead_days_max,
       c.slug AS category_slug, c.name_vi AS category_name
FROM profile_capabilities pc
JOIN categories c ON c.id = pc.category_id
WHERE pc.profile_id = $1
ORDER BY c.sort_order, c.name_vi, pc.production_model;

-- name: UpsertCapability :exec
-- Dùng cho seed demo — idempotent theo (profile_id, category_id, production_model).
INSERT INTO profile_capabilities (
  profile_id, category_id, production_model, usual_min_order_qty, sample_supported
)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (profile_id, category_id, production_model) DO UPDATE
  SET usual_min_order_qty = EXCLUDED.usual_min_order_qty,
      sample_supported    = EXCLUDED.sample_supported;
