-- name: UpsertCapability :exec
-- Dùng cho seed demo — idempotent theo (profile_id, category_id, production_model).
INSERT INTO profile_capabilities (
  profile_id, category_id, production_model, usual_min_order_qty, sample_supported
)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (profile_id, category_id, production_model) DO UPDATE
  SET usual_min_order_qty = EXCLUDED.usual_min_order_qty,
      sample_supported    = EXCLUDED.sample_supported;
