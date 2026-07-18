-- name: UpsertBriefMatch :one
-- Shortlist một xưởng cho brief. Idempotent theo (buyer_brief_id, profile_id).
INSERT INTO brief_matches (buyer_brief_id, profile_id, match_level, reasons, concerns)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (buyer_brief_id, profile_id) DO UPDATE
  SET match_level = EXCLUDED.match_level,
      reasons     = EXCLUDED.reasons,
      concerns    = EXCLUDED.concerns
RETURNING id;

-- name: ListBriefMatches :many
SELECT m.profile_id, m.match_level, m.reasons, m.concerns,
       p.slug AS profile_slug, p.name AS profile_name
FROM brief_matches m
JOIN profiles p ON p.id = m.profile_id
WHERE m.buyer_brief_id = $1
ORDER BY m.match_level, m.matched_at;

-- name: GetBriefMatchID :one
SELECT id FROM brief_matches
WHERE buyer_brief_id = $1 AND profile_id = $2;
