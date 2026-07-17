# [TASK-001] Nền móng: khung repo + schema database (migration đầu tiên)

- **Status:** in-review (nhánh feature/foundation-db-schema đã commit; chờ founder duyệt)
- **Owner:** vuongstus
- **Branch:** feature/foundation-db-schema · **PR:** (chưa mở — chưa có git remote)
- **Mode:** vibe

## Gate status
- [x] **Challenge** (pre-build critique) — **go** (critique nén, xem mục Decisions)
- [x] **Impact map** — greenfield, DB rỗng; không có caller/job/event nào đang chạy để phá vỡ
- [x] **Review** (correctness + consistency) — khớp spec (27 bảng/15 enum đúng số); theo chuẩn §3/§7; không dùng DROP CASCADE; goose đã ghi Decision Log
- [x] **Tests** pass — Postgres 16 (Docker): up apply sạch 9/9 file → 27 bảng, 15 enum, 1 view, 8 trigger; down rollback → 0 bảng, 0 enum
- [x] **Required artifacts** present — schema change: mỗi migration có block Down (rollback) + verify roundtrip đã chạy
- [x] **Approval** (schema) — n/a (chưa có production; approver list rỗng → self-approve)

## Scope
- **In:** Init git repo; dựng khung thư mục monorepo theo coding standards §3; viết migration goose đầu tiên tạo toàn bộ schema v3.3 (extensions, functions, enums, tables, indexes, view, triggers), chia theo domain; verify bằng Postgres trong Docker (apply lên DB rỗng + rollback).
- **Out:** Go API server (chưa cài Go); Next.js app; sqlc config/generate; OpenAPI; middleware; seed master data (province/district) — để lát sau.

## Acceptance criteria (definition of done)
- [ ] `git` repo init, branch `main`, có `.gitignore` phù hợp Go+Node.
- [ ] Khung thư mục khớp coding standards §3 (apps/web, cmd/, internal/, db/, api/, scripts/).
- [ ] Tất cả migration goose apply sạch trên một Postgres rỗng (không lỗi).
- [ ] Rollback (goose down) chạy được, đưa DB về rỗng.
- [ ] Đặt tên file `YYYYMMDDHHMMSS_description.sql`; timestamp sinh bằng lệnh, không gõ tay.

## Impact map (what it touches)
- Reads/writes: tạo mới `db/migrations/*.sql`, `.gitignore`, `README.md`, `Makefile`, thư mục skeleton.
- Callers / jobs / events: không có (greenfield).
- Tests affected: chưa có test suite; verify bằng Docker Postgres.

## Plan (smallest slices, in order)
1. Skeleton repo + .gitignore + README + Makefile → commit
2. Migration files (9 file goose, chia theo domain, đúng thứ tự FK) → commit
3. Verify: Docker Postgres → apply tất cả up → kiểm tra bảng → apply down → commit bằng chứng

## Tests to add / run
- Apply thủ công các block `-- +goose Up` theo thứ tự tên file vào Postgres 16 (Docker) trên DB rỗng → 0 lỗi.
- `\dt` liệt kê đủ bảng; kiểm view `current_capability_availability` tồn tại.
- Apply các block `-- +goose Down` theo thứ tự ngược → DB về rỗng (0 bảng, 0 type).

## Risks & rollback
- **Lỗi transcription/thứ tự FK** khi tách schema thành nhiều file → rollback: sửa file migration (chưa chạy production nên được sửa tự do); verify lại bằng Docker.
- **Chọn goose thay golang-migrate** → nếu sau này đổi, chỉ ảnh hưởng format annotation, không ảnh hưởng schema.

## Decisions
- **Migration tool = goose.** Vì tên file mẫu trong coding standards là `.sql` đơn (không tách up/down) → khớp goose. Ghi vào Decision Log.
- **Chia migration theo domain** (9 file) thay vì 1 file khổng lồ → mỗi migration một mục tiêu rõ ràng (chuẩn §7.1), dễ review.
- **Challenge (nén):** correctness — rủi ro transcription, chặn bằng verify thật trên Postgres; security/data — chỉ tạo bảng rỗng, không đụng PII; consistency — theo chuẩn §3/§7; simplicity — split hợp lý; reversibility — mỗi file có down, greenfield an toàn. → **GO**.
