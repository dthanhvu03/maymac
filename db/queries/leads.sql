-- name: InsertLead :one
-- Lead cho cặp (brief × profile). current_status khởi tạo 'created'.
INSERT INTO leads (public_token, buyer_brief_id, profile_id, brief_match_id, current_status)
VALUES ($1, $2, $3, $4, 'created')
RETURNING id;

-- name: ListLeads :many
SELECT l.public_token, l.current_status, l.created_at,
       p.slug AS profile_slug, p.name AS profile_name,
       b.public_token AS brief_token
FROM leads l
JOIN profiles p ON p.id = l.profile_id
JOIN buyer_briefs b ON b.id = l.buyer_brief_id
ORDER BY l.created_at DESC, l.id DESC
LIMIT sqlc.arg(page_size) OFFSET sqlc.arg(page_offset);

-- name: CountLeads :one
SELECT count(*) FROM leads;

-- name: InsertLeadStatusHistory :exec
INSERT INTO lead_status_history (lead_id, from_status, to_status, note)
VALUES ($1, $2, $3, $4);

-- name: GetLeadByToken :one
SELECT id, current_status FROM leads WHERE public_token = $1;

-- name: UpdateLeadStatus :execrows
-- Atomic: chỉ đổi khi current_status đúng bằng from. 0 dòng = đã đổi (race) -> 409.
-- Set mốc timestamp tương ứng. Enum param cast ::lead_status (bắt buộc cho pgx bind).
UPDATE leads SET
  current_status    = sqlc.arg(to_status)::lead_status,
  sent_at           = CASE WHEN sqlc.arg(to_status)::lead_status = 'sent'           AND sent_at           IS NULL THEN now() ELSE sent_at           END,
  viewed_at         = CASE WHEN sqlc.arg(to_status)::lead_status = 'viewed'         AND viewed_at         IS NULL THEN now() ELSE viewed_at         END,
  first_response_at = CASE WHEN sqlc.arg(to_status)::lead_status = 'responded'      AND first_response_at IS NULL THEN now() ELSE first_response_at END,
  quoted_at         = CASE WHEN sqlc.arg(to_status)::lead_status = 'quoted'         AND quoted_at         IS NULL THEN now() ELSE quoted_at         END,
  sample_started_at = CASE WHEN sqlc.arg(to_status)::lead_status = 'sample_started' AND sample_started_at IS NULL THEN now() ELSE sample_started_at END,
  won_at            = CASE WHEN sqlc.arg(to_status)::lead_status = 'won'            AND won_at            IS NULL THEN now() ELSE won_at            END,
  lost_at           = CASE WHEN sqlc.arg(to_status)::lead_status = 'lost'           AND lost_at           IS NULL THEN now() ELSE lost_at           END,
  expired_at        = CASE WHEN sqlc.arg(to_status)::lead_status = 'expired'        AND expired_at        IS NULL THEN now() ELSE expired_at        END
WHERE id = sqlc.arg(id) AND current_status = sqlc.arg(from_status)::lead_status;

-- name: UpsertLeadOutcome :exec
-- Ghi lý do mất lead (và các trường outcome khác sau này). Idempotent theo lead_id.
INSERT INTO lead_outcomes (lead_id, lost_reason)
VALUES ($1, $2)
ON CONFLICT (lead_id) DO UPDATE SET lost_reason = EXCLUDED.lost_reason;
