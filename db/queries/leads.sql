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
