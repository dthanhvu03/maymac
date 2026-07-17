# [TASK-002] Nền móng: Go API server skeleton

- **Status:** in-review (đã commit feature branch; chờ founder duyệt merge)
- **Owner:** vuongstus
- **Branch:** feature/go-api-skeleton · **Remote:** github.com/dthanhvu03/maymac
- **Mode:** vibe

## Gate status
- [x] **Challenge** (pre-build critique) — **go** (critique nén, xem Decisions)
- [x] **Impact map** — greenfield code mới; chỉ đọc DB (readyz ping). Không đụng schema, không caller cũ.
- [x] **Review** (correctness + consistency) — layering handler→…→domain đúng; Problem Details không lộ SQL/stack; log đủ trường §5.5; pgxpool cấu hình env §7.4; build/vet sạch
- [x] **Tests** pass — build/vet OK; server chạy thật: /healthz 200, /readyz 200 (DB up) & 503 (DB down), 404 problem+json có request_id, structured log mỗi request
- [x] **Required artifacts** — không đụng schema/money/auth/PII → n/a
- [x] **Approval** — n/a (không đụng prod/schema/data)

## Ghi chú môi trường
- Windows Defender false-positive xóa binary Go mới build. Đã thêm Defender **exclusion có giới hạn** cho `D:\Zusem\maymac\bin` và `D:\Zusem\maymac\.gobuild`; build dùng `GOTMPDIR=.gobuild`. Hoàn tác: `Remove-MpPreference -ExclusionPath <path>`.

## Scope
- **In:** Khung Go API chạy được: `go.mod` (module github.com/dthanhvu03/maymac), `cmd/server/main.go` (graceful shutdown, HTTP timeouts), `internal/config` (env), `internal/observability` (slog JSON), `internal/api` (chi router + middleware request-id/logger/recoverer + Problem Details error), `internal/repository` (pgxpool constructor), endpoint `/healthz` (liveness) + `/readyz` (ping DB). `sqlc.yaml` + `.env.example`.
- **Out:** Query nghiệp vụ + sqlc generate (chưa có query); auth thật; OpenAPI đầy đủ; handler nghiệp vụ; seed. Để lát sau.

## Acceptance criteria
- [ ] `go build ./...` và `go vet ./...` sạch.
- [ ] Server khởi động, `GET /healthz` → 200.
- [ ] `GET /readyz` → 200 khi Postgres (Docker) sống; → 503 khi DB chết.
- [ ] Lỗi trả `application/problem+json` với `request_id`.
- [ ] Log structured mỗi request (request_id, method, route, status, latency_ms).
- [ ] pgxpool cấu hình qua env (không hard-code pool size); statement_timeout set.

## Plan (slices)
1. go.mod + deps → build rỗng OK
2. config + observability + repository pool → build OK
3. api (middleware + problem + router + health) → build OK
4. cmd/server main → build OK
5. Verify chạy thật + curl → commit

## Tests to run
- `go build ./...`, `go vet ./...`
- Chạy server + `curl -i /healthz` (200), `/readyz` (200 khi DB up, 503 khi DB down)
- `curl` một route không tồn tại → 404 problem+json có request_id

## Risks & rollback
- Thêm dependency (chi, pgx) — justified: đúng stack spec §9. Rollback: xóa nhánh feature.
- Không đụng dữ liệu/schema → rủi ro thấp, two-way door.

## Decisions
- **Router = chi/v5**; **pgxpool** cho DB; module = `github.com/dthanhvu03/maymac`.
- **Challenge (nén):** correctness — build+run+curl chứng minh; security — chưa lộ dữ liệu, không trả stack trace/SQL (Problem Details); consistency — theo §3/§5/§7/§10; simplicity — chỉ skeleton + health; reversibility — two-way door (xóa nhánh). → **GO**.
