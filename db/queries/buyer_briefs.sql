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

-- name: ListBuyerBriefs :many
-- Queue admin: lọc theo status (tùy chọn), mới nhất trước.
SELECT id, public_token, status, buyer_name, buyer_phone, company_or_brand,
       submitted_at, created_at
FROM buyer_briefs
WHERE (sqlc.narg(status)::brief_status IS NULL OR status = sqlc.narg(status)::brief_status)
ORDER BY submitted_at DESC NULLS LAST, id DESC
LIMIT sqlc.arg(page_size) OFFSET sqlc.arg(page_offset);

-- name: CountBuyerBriefs :one
SELECT count(*)
FROM buyer_briefs
WHERE (sqlc.narg(status)::brief_status IS NULL OR status = sqlc.narg(status)::brief_status);

-- name: GetBuyerBriefByToken :one
SELECT id, public_token, status, buyer_name, buyer_phone, company_or_brand, submitted_at
FROM buyer_briefs
WHERE public_token = $1;

-- name: UpdateBriefStatus :execrows
-- Cập nhật atomic: chỉ đổi khi status hiện tại đúng bằng $2 (from). 0 dòng = đã đổi
-- dưới tay (race) -> caller trả 409. Set mốc timestamp tương ứng (§12.2).
UPDATE buyer_briefs SET
  status       = sqlc.arg(to_status)::brief_status,
  reviewed_at  = CASE WHEN sqlc.arg(to_status)::brief_status = 'under_review' AND reviewed_at  IS NULL THEN now() ELSE reviewed_at  END,
  qualified_at = CASE WHEN sqlc.arg(to_status)::brief_status = 'qualified'    AND qualified_at IS NULL THEN now() ELSE qualified_at END,
  matched_at   = CASE WHEN sqlc.arg(to_status)::brief_status = 'matched'      AND matched_at   IS NULL THEN now() ELSE matched_at   END,
  rejected_at  = CASE WHEN sqlc.arg(to_status)::brief_status = 'rejected'     AND rejected_at  IS NULL THEN now() ELSE rejected_at  END,
  cancelled_at = CASE WHEN sqlc.arg(to_status)::brief_status = 'cancelled'    AND cancelled_at IS NULL THEN now() ELSE cancelled_at END,
  closed_at    = CASE WHEN sqlc.arg(to_status)::brief_status = 'closed'       AND closed_at    IS NULL THEN now() ELSE closed_at    END
WHERE id = sqlc.arg(id) AND status = sqlc.arg(from_status)::brief_status;
