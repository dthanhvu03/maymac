-- name: InsertBuyerBrief :one
-- Tạo Buyer Brief ở trạng thái submitted (public submit). submitted_at = now().
INSERT INTO buyer_briefs (
  public_token, status,
  buyer_name, buyer_phone, buyer_zalo, buyer_email, company_or_brand,
  desired_deadline, production_model, sample_required,
  preferred_province_code, preferred_district_id,
  target_price_note, general_note, source, submitted_at
) VALUES (
  $1, 'submitted',
  $2, $3, $4, $5, $6,
  $7, $8, $9,
  $10, $11,
  $12, $13, $14, now()
)
RETURNING id;

-- name: InsertBuyerBriefItem :exec
INSERT INTO buyer_brief_items (
  buyer_brief_id, category_id, estimated_quantity, colors_note, material_note
) VALUES ($1, $2, $3, $4, $5);

-- name: InsertBriefStatusHistory :exec
INSERT INTO buyer_brief_status_history (buyer_brief_id, from_status, to_status, note)
VALUES ($1, $2, $3, $4);
