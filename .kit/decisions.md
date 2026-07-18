# Decision Log (append-only)

> Every non-trivial technical decision. Agents read this at the start of every session and must stay consistent with it. Append; do not rewrite history.

<!-- Format per entry:
## YYYY-MM-DD — <short title>
- **Decision:** what was chosen
- **Why:** plain-language reason
- **Applies to:** paths/areas affected
-->

## (seed) — Project scaffolded
- **Decision:** Universal Agent Kit installed in `vibe` mode with the `generic` profile.
- **Why:** fast start with guardrails on.
- **Applies to:** whole repo.

## 2026-07-17 — Onboarding: chốt danh tính dự án & stack
- **Decision:** maymac là nền tảng directory + matching cho ngành gia công may mặc (V1 pilot: chuẩn hóa/xác minh dữ liệu xưởng, thu Buyer Brief, matching thủ công + theo dõi lead; KHÔNG thanh toán/escrow/đấu giá/chat/AI). Hiến pháp đã điền đầy đủ trong `.kit/constitution.md`.
- **Why:** Đọc từ spec `docs/Directory_Matching_nganh_gia_cong_may_mac_v3.3.md` + `docs/CODING_STANDARDS_Directory_Matching_v1.1.md`, xác nhận với founder.
- **Applies to:** whole repo.

## 2026-07-17 — Ngôn ngữ & stack profile
- **Decision:** Đổi `project.language` sang `vi`; đổi `stack.profile` sang `[go, nextjs]` với `roots.nextjs = apps/web` (Go ở gốc repo). Rebuild kit.
- **Why:** Toàn bộ tài liệu/UI bằng tiếng Việt; backend Go + frontend Next.js (monorepo) theo coding standards. Trước đó config để `en`/`generic` do cài đặt zero-question.
- **Applies to:** `kit.config.yaml`, các rule sinh ra (`go-conventions`, `nextjs-conventions`).

## 2026-07-17 — Công cụ migration = goose
- **Decision:** Dùng **goose** cho database migration (không dùng golang-migrate). Mỗi file 1 mục tiêu, tên `YYYYMMDDHHMMSS_description.sql`, có block `-- +goose Up`/`-- +goose Down`; timestamp sinh bằng lệnh, không gõ tay.
- **Why:** Coding standards §7.1 nêu tên file `.sql` đơn (không tách `.up/.down`) → khớp định dạng goose. Down migration cho phép rollback thật, thỏa evidence gate cho thay đổi schema.
- **Applies to:** `db/migrations/`, `Makefile` (`migrate-up/down/status`), `scripts/verify-migrations.sh`.

## 2026-07-17 — Nền móng: khung repo + schema database
- **Decision:** Dựng khung monorepo theo coding standards §3 và tạo toàn bộ schema v3.3 bằng 9 migration chia theo domain (27 bảng, 15 enum, 1 view, 8 trigger `updated_at`). Verify bằng Postgres 16 trong Docker (apply psql, không cần Go).
- **Why:** Go chưa được cài trên máy dev → chọn lớp nền có giá trị nhất và verify được ngay là database. Go API server và Next.js app hoãn sang lát sau.
- **Applies to:** toàn repo; xem task `.kit/tasks/001-foundation-db-schema.md`.

## 2026-07-17 — Go API server skeleton
- **Decision:** Backend HTTP dùng **chi/v5** (router + RequestID/RealIP) và **pgx/v5 pgxpool**. Module Go = `github.com/dthanhvu03/maymac`, `go 1.26`. Lỗi API theo `application/problem+json` (RFC 7807, kèm `request_id`, không lộ SQL/stack). Log structured bằng `slog` JSON. Config nạp từ env (pool size, `statement_timeout`, `idle_in_transaction_session_timeout`, HTTP timeouts). Health: `/healthz` (liveness) + `/readyz` (ping DB). Layering `handler → service → repository → domain`.
- **Why:** Đúng stack spec §9 và chuẩn §3/§5/§7/§10; skeleton chạy được + verify runtime trước khi thêm nghiệp vụ.
- **Applies to:** `cmd/server`, `internal/*`, `sqlc.yaml`; xem task `.kit/tasks/002-go-api-skeleton.md`.

## 2026-07-17 — Defender exclusion cho build Go (môi trường dev)
- **Decision:** Thêm Windows Defender exclusion có giới hạn cho `D:\Zusem\maymac\bin` và `D:\Zusem\maymac\.gobuild`; build Go đặt `GOTMPDIR=D:\Zusem\maymac\.gobuild`.
- **Why:** Defender false-positive xóa binary Go mới compile, chặn cả `go build`. Exclusion phạm vi hẹp (không tắt Defender toàn máy). Hoàn tác: `Remove-MpPreference -ExclusionPath <path>`.
- **Applies to:** máy dev hiện tại; `.gitignore` đã bỏ qua `/bin/` và `/.gobuild/`.

## 2026-07-17 — Wiring goose + sqlc
- **Decision:** Migration chạy qua **goose** CLI (`goose_db_version` theo dõi state), **sqlc v1.31** sinh code từ `db/migrations` (schema) + `db/queries` (query). Tool dev cài bằng `make setup` vào `./bin` (không commit). Code sinh ra ở `internal/repository/sqlcgen/` **được commit**. Query khởi đầu: `db/queries/provinces.sql`.
- **Why:** Đúng chuẩn §7 (goose) và §8 (sqlc, SQL review được, không ORM). sqlc bắt buộc có ≥1 query mới generate.
- **Applies to:** `db/queries/`, `internal/repository/sqlcgen/`, `Makefile` (`setup`, `generate`, `migrate-*`); xem task `.kit/tasks/003-goose-sqlc-wiring.md`.

## 2026-07-17 — Master data qua seed command + vertical slice đầu tiên
- **Decision:** Master data (tỉnh/quận) nạp bằng `cmd/seed --master` **idempotent** (upsert), KHÔNG nhét vào migration. Endpoint đọc đi đủ lớp `handler → service → repository(sqlc) → domain`, trả **DTO allowlist** (`dto.ProvinceResponse`), không serialize sqlc row. Route đặt dưới `/api` (`GET /api/provinces`). Service tách interface (`ProvinceStore`) làm seam test.
- **Why:** Makefile/§7.1 tách seed-master khỏi seed-demo; data trong migration cứng. Đây là vertical slice mẫu chứng minh toàn kiến trúc chạy end-to-end. Dữ liệu tỉnh/quận là seed pilot chỉnh sửa được (lưu ý cải cách hành chính 2025).
- **Applies to:** `cmd/seed`, `internal/{domain,repository,service}/location.go`, `internal/api/{dto,handler}/location.go`, `internal/api/router.go`; xem task `.kit/tasks/004-master-data-and-provinces-api.md`.

## 2026-07-17 — Profile list API (EXISTS semi-join)
- **Decision:** `GET /api/profiles` list công khai CHỈ `status='published'`. Filter capability (category_id/production_model/sample_supported/max_moq) bằng **semi-join EXISTS** kích hoạt khi có bất kỳ filter capability (§12.6), KHÔNG JOIN+DISTINCT. Count query tách. Sort `featured DESC, id DESC` (tie-break id). Pagination `page`+`per_page` (default 20, max 50), kẹp ở service. List card = DTO allowlist profile-level (không lộ aggregate/contact); batch-loading capability/ảnh (§8.6) hoãn. Filter dùng `sqlc.narg` (nullable → con trỏ trong Go). Category là master data (seed --master); demo profiles/capabilities qua seed --demo.
- **Why:** Đúng §8/§12.6; phân trang/sort ổn định ở tầng profile; bảo vệ dữ liệu nội bộ bằng allowlist.
- **Applies to:** `db/queries/{profiles,capabilities,categories}.sql`, `internal/{domain,repository,service}/profile.go`, `internal/api/{dto,handler}/profile.go`, `cmd/seed`; xem task `.kit/tasks/005-profile-list-api.md`.

## 2026-07-17 — Profile detail API + slug redirect 301
- **Decision:** `GET /api/profiles/{slug}` trả detail CHỈ profile `published`, kèm capabilities (join category). Slug không khớp → resolve `profile_slug_redirects` → **301** về canonical (§12.8, slug đã publish bất biến); không có → 404. DTO detail allowlist: gồm contact xưởng (để buyer liên hệ) nhưng KHÔNG aggregate nội bộ/object_key riêng. **Availability + ảnh portfolio hoãn** sang slice riêng (Layer-2, cần time/freshness rules). Repository `UpsertProfile` nhận struct (tránh >7 param).
- **Why:** Hoàn thiện luồng discovery (list → detail); honor slug-immutable + SEO redirect; giữ dữ liệu nội bộ private.
- **Applies to:** `db/queries/{profiles,capabilities}.sql`, `internal/{domain,repository,service}/profile.go`, `internal/api/{dto,handler}/profile.go`, `internal/api/router.go`, `cmd/seed`; xem task `.kit/tasks/006-profile-detail-api.md`.

## 2026-07-17 — Buyer Brief submit (public write, idempotent)
- **Decision:** `POST /api/buyer-briefs` tạo brief ở `submitted` trong **một transaction** (brief + items + status history null→submitted, §12.2). **Idempotency** qua header `Idempotency-Key`: `idempotency_records(scope,key_hash)` UNIQUE — trùng key+body → replay 200 cùng token; trùng key khác body → 409; race → unique-violation → replay (guard ở DB). Validate ở biên (buyer_name, buyer_phone, ≥1 item category+qty>0); §6.3 các trường khác optional. `public_token` random opaque qua `internal/token` (base32, không dùng id tuần tự). **PII**: không log tên/SĐT; response chỉ trả token+status.
- **Why:** Đây là luồng ghi công khai đầu tiên (thu lead) — reliability rule bắt buộc: chống double-submit tạo lead trùng, transaction toàn vẹn, bảo vệ PII.
- **Applies to:** `db/queries/{buyer_briefs,idempotency}.sql`, `internal/token`, `internal/{domain,repository,service}/brief.go`, `internal/api/{dto,handler}/brief.go`, `internal/api/router.go`; xem task `.kit/tasks/008-buyer-brief-submit.md`. Hoãn: upload attachment, admin lifecycle transitions, GET brief theo token, rate-limit/anti-spam.

## 2026-07-17 — Admin gate (bearer token) + Buyer Brief state machine
- **Decision:** Nhóm `/api/admin/*` bảo vệ bằng **static bearer token** (`ADMIN_API_TOKEN` env) — KHÔNG phải user/session/JWT (hoãn cho pilot 1 nhóm admin). Middleware: **fail-closed** (token rỗng→503), so sánh **constant-time** (`subtle.ConstantTimeCompare`), 401 chung chung, không log token. Chuyển trạng thái Buyer Brief theo state machine §17.1 trong `domain` (transition ngoài map→409); cập nhật **atomic** bằng conditional `UPDATE ... WHERE id=? AND status=from` (`:execrows`, 0 dòng→409) + history + timestamp mốc, trong một transaction (§12.2). **Query enum param PHẢI cast `::brief_status`** (pgx bind — bug phát hiện khi verify chạy thật).
- **Why:** Mở khóa xử lý lead (list + transition) mà không dựng auth lớn; guard race ở DB; giữ bí mật admin.
- **Applies to:** `internal/config`, `internal/api/middleware/adminauth.go`, `db/queries/buyer_briefs.sql`, `internal/{domain,repository,service}/brief*.go`, `internal/api/{dto,handler}/brief.go`, `internal/api/router.go`; xem task `.kit/tasks/009-admin-brief-processing.md`. Hoãn: auth thật/RBAC, audit-actor (admin_audit_logs), rate-limit.

## 2026-07-17 — Rate-limit công khai (in-memory per-IP)
- **Decision:** Rate-limit **token-bucket per-IP in-memory** (`golang.org/x/time/rate`, direct dep) áp cho nhóm `/api` (gồm admin — defense in depth); health `/healthz`,`/readyz` ở root KHÔNG bị giới hạn. Cấu hình env `PUBLIC_RATE_LIMIT_RPM` (mặc định 120) + `_BURST` (40). Vượt → **429 + Retry-After** (problem+json). Có goroutine **evict bucket idle > TTL** + `Close()` khi shutdown (không leak). KHÔNG Redis (spec §0.5 hoãn) → hạn chế: per-instance, nhiều instance cần shared store sau.
- **Why:** Trả nợ an toàn cho endpoint công khai (đặc biệt POST buyer-briefs) trước khi có traffic; chống spam/abuse cơ bản.
- **Applies to:** `internal/config`, `internal/api/middleware/ratelimit.go`, `internal/api/router.go`, `cmd/server/main.go`; xem task `.kit/tasks/010-rate-limit.md`. Hoãn: shared limiter đa-instance, trusted-proxy config, CAPTCHA, limit riêng theo endpoint.

## 2026-07-17 — Concierge matching + tạo Lead
- **Decision:** Admin shortlist xưởng cho brief bằng `brief_matches` (UNIQUE(brief,profile) → upsert; match_level high/medium/low/insufficient_data; reasons/concerns JSONB). **Lead** (`leads`) tạo cho cặp (brief×profile) ở `created` + history null→created trong transaction; **invariant §12.3: chỉ tạo lead khi ĐÃ có match** (service kiểm `MatchID`, chưa có→422); UNIQUE(brief,profile)→409. Endpoint admin: `POST/GET .../matches`, `POST .../leads`, `GET /leads`. Router refactor gom handler vào `api.Handlers` struct (tránh >7 tham số). Lead public_token qua `internal/token`.
- **Why:** Spine concierge của V1 — biến brief đã sàng lọc thành lead phát cho xưởng; Outcome Data (lợi thế cạnh tranh) bắt đầu từ đây.
- **Applies to:** `db/queries/{matches,leads}.sql`, `internal/domain/{match,lead}.go`, `internal/repository/match.go`, `internal/service/match.go`, `internal/api/{dto,handler}/match.go`, `internal/api/router.go`; xem task `.kit/tasks/011-matching-and-lead-creation.md`. Hoãn: vòng đời Lead (sent→won/lost/expired) + lead_outcomes + rebuild-profile-metrics; matching tự động.

## 2026-07-17 — Security fix: rate-limit không còn bị spoof qua X-Forwarded-For
- **Context:** Review phát hiện `chimw.RealIP` ghi đè `RemoteAddr` từ header client tự đặt (`X-Forwarded-For`/`X-Real-IP`); rate limiter key theo `RemoteAddr` → kẻ tấn công đổi XFF mỗi request là tạo bucket mới, **vô hiệu chống-spam `POST /api/buyer-briefs`** và **brute-force token admin không giới hạn**.
- **Decision:** Bỏ `chimw.RealIP` khỏi middleware chain; `clientIP` dùng thẳng TCP peer (`RemoteAddr`), cố tình KHÔNG đọc XFF. Thêm regression test `TestRateLimit_IgnoresForwardedForSpoofing`.
- **Why / alternatives:** Ở pilot (traffic trực tiếp, 1 instance) TCP peer là nguồn IP đúng và không spoof được. Không dựng trusted-proxy config vội (YAGNI cho pilot).
- **Consequences / reversibility:** two-way door. Khi deploy SAU reverse proxy tin cậy (LB/CDN), phải thêm middleware RealIP có **trusted-proxy CIDR allowlist** (chỉ tin XFF khi peer nằm trong dải proxy), nếu không rate-limit sẽ gom mọi traffic vào IP của proxy.
- **Applies to:** `internal/api/router.go`, `internal/api/middleware/ratelimit.go` + test.

## 2026-07-17 — Vòng đời Lead (transition + outcome)
- **Decision:** `POST /api/admin/leads/{token}/transition` chuyển trạng thái Lead theo state machine §17.1 (transition ngoài map→409). Atomic ở DB: `UPDATE leads ... WHERE id AND current_status=from` (`:execrows`, 0 dòng→409) + set timestamp mốc (sent_at/first_response_at/quoted_at/…) + `lead_status_history`, trong một transaction. Chuyển sang **lost bắt buộc `lost_reason`** (enum) → ghi `lead_outcomes` (upsert theo lead_id) trong cùng tx. Enum param cast `::lead_status` (bài học TASK-009).
- **Why:** Khép vòng đời lead tới won/lost — bắt đầu tích lũy Outcome Data (vì sao thắng/mất) là lõi giá trị khó sao chép của sản phẩm.
- **Applies to:** `db/queries/leads.sql`, `internal/domain/lead.go`, `internal/repository/lead.go`, `internal/service/match.go`, `internal/api/handler/match.go`, `internal/api/router.go`; xem task `.kit/tasks/012-lead-lifecycle.md`. Hoãn: outcome đầy đủ (order/delivery), `cmd/rebuild-profile-metrics`, expire tự động.
