# [TASK-003] Nối DB ↔ code: goose migrate + sqlc generate

- **Status:** in-review (đã commit; chờ founder duyệt merge)
- **Owner:** vuongstus
- **Branch:** feature/goose-sqlc-wiring · **Remote:** github.com/dthanhvu03/maymac
- **Mode:** vibe

## Gate status
- [x] **Challenge** — **go** (nén: tooling + generate code; two-way door)
- [x] **Impact map** — thêm tool dev (goose, sqlc) + code sinh ra ở `internal/repository/sqlcgen`; không sửa migration/schema.
- [x] **Review** — code sqlc sinh ra idiomatic (pgx/v5, context-first, xử lý rows/err đúng); Makefile trỏ tool vào ./bin; không đụng schema.
- [x] **Tests** pass — goose up: 9/9 applied + `goose status` liệt kê đủ; sqlc generate → db.go/models.go/provinces.sql.go; `go build ./...` + `go vet ./...` sạch.
- [x] **Required artifacts** — không đụng schema mới → n/a
- [x] **Approval** — n/a

## Ghi chú
- Postgres `docker run` báo `pg_isready` sớm nhưng TCP chưa sẵn (image restart sau init) → retry kết nối vài giây trước khi migrate.
- sqlc cần ≥1 query mới sinh code → thêm `db/queries/provinces.sql` (read-only master data) làm query khởi đầu.
- goose/sqlc build vào `./bin` (Defender-excluded), không commit (gitignored).

## Scope
- **In:** Cài `goose` + `sqlc` (Go tools). Chạy `goose up` thật lên Postgres (Docker) → migration được apply + bảng `goose_db_version` theo dõi. Chạy `sqlc generate` sinh models từ schema (db/migrations). Verify `go build ./...` vẫn sạch với package sinh ra.
- **Out:** Query nghiệp vụ (chưa viết .sql); repository code thật; seed. Bước sau.

## Acceptance criteria
- [ ] `goose -dir db/migrations up` chạy sạch trên DB rỗng; `goose status` hiển thị 9 migration applied.
- [ ] `sqlc generate` tạo `internal/repository/sqlcgen/` (models từ schema) không lỗi.
- [ ] `go build ./...` + `go vet ./...` sạch (bao gồm package sinh ra).

## Plan (slices)
1. Cài goose + sqlc vào bin/ (GOBIN excluded) → verify chạy
2. goose up trên Docker Postgres → status 9 applied
3. sqlc generate → build lại sạch → commit

## Tests to run
- `bin/goose ... up` + `status`; đếm bảng trong DB.
- `bin/sqlc generate`; `go build ./...`, `go vet ./...`.

## Risks & rollback
- Defender có thể xóa goose/sqlc.exe → build vào bin/ đã loại trừ.
- sqlc có thể không parse annotation goose → nếu lỗi, đổi schema trỏ sang db/schema.sql sinh riêng.
- Rollback: xóa nhánh feature + `internal/repository/sqlcgen`.

## Decisions
- goose/sqlc cài bằng `go install` vào `GOBIN=bin/`; sqlc đọc schema trực tiếp từ `db/migrations` (goose annotations).
