-- name: GetIdempotencyRecord :one
SELECT request_hash, resource_public_token, response_status
FROM idempotency_records
WHERE scope = $1 AND key_hash = $2;

-- name: InsertIdempotencyRecord :exec
INSERT INTO idempotency_records (
  scope, key_hash, request_hash, resource_type, resource_public_token, response_status, expires_at
) VALUES ($1, $2, $3, $4, $5, $6, $7);
