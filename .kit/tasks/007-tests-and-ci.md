# [TASK-007] Test tự động (unit) + CI GitHub Actions

- **Status:** in-review (đã commit; chờ founder duyệt merge)
- **Owner:** vuongstus
- **Branch:** feature/tests-and-ci · **Remote:** github.com/dthanhvu03/maymac
- **Mode:** vibe

## Gate status
- [x] **Challenge** — **go** (nén; two-way door, chỉ thêm test + CI)
- [x] **Impact map** — thêm `*_test.go` (service, handler), `make test` thật, `.github/workflows/ci.yml`. Không sửa logic sản phẩm. Không đụng schema/DB.
- [x] **Review** — test table-driven, dùng fake store qua interface `ProfileStore`; không cần DB; gofmt/vet sạch.
- [x] **Tests** pass — `go test ./...`: **18/18 PASS** (handler: parse valid/invalid×5/empty; service: clamp per_page×5, GetProfileDetail 3 nhánh).
- [x] **Required artifacts** — n/a
- [~] **Approval** — CI GitHub Actions đã cấu hình; sẽ chạy trên push/PR. **Chưa quan sát được kết quả run trên GitHub từ máy** (không có gh CLI) — cần xem tab Actions để xác nhận xanh.

## Scope
- **In:** Unit test table-driven cho `ProfileService` (kẹp per_page; logic GetProfileDetail: found / redirect / not-found qua fake store) và `parseProfileFilter` (validate query param). Wire `make test` = `go test ./...`. CI: build + vet + test trên push/PR (không cần DB — unit only).
- **Out:** Integration test chạm DB thật (tag riêng, sau); test handler HTTP đầy đủ; test cho luồng chưa có.

## Design (nén)
- Test **unit thuần**, không cần Postgres → CI nhanh, chạy được ở GitHub runner. Repository/DB integration test để slice riêng (cần dịch vụ Postgres trong CI).
- Dùng `ProfileStore` interface (seam đã tạo) để fake store — không cần DB.
- CI đọc go version từ `go.mod` (không pin lệch).

## Plan
1. service/profile_test.go (fake store, table-driven) → go test
2. handler/profile_test.go (parseProfileFilter) → go test
3. Makefile `test` thật + `.github/workflows/ci.yml` → chạy `go test ./...` lấy bằng chứng → commit

## Tests to run
- `go test ./...` (đếm pass), `go vet ./...`, `go build ./...`

## Risks & rollback
- CI có thể đỏ lần đầu do version/setup → chỉnh workflow; không ảnh hưởng code. Rollback: xóa nhánh.

## Decisions
- Unit test + CI (build/vet/test, no DB). Integration test DB hoãn sang slice riêng.
