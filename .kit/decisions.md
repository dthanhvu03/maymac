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
