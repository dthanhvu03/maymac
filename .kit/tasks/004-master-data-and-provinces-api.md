# [TASK-004] Seed master data + endpoint GET /api/provinces

- **Status:** in-review (đã commit; chờ founder duyệt merge)
- **Owner:** vuongstus
- **Branch:** feature/master-data-provinces-api · **Remote:** github.com/dthanhvu03/maymac
- **Mode:** vibe

## Gate status
- [x] **Challenge** — **go** (nén, xem Design/Decisions)
- [x] **Impact map** — mới: `cmd/seed`, queries provinces/districts, repository/service/handler location, route `/api/provinces`. Ghi provinces+districts (idempotent upsert). Không sửa schema. Đọc: `provinces`. Không caller cũ bị ảnh hưởng (router chỉ thêm route).
- [x] **Review** — layering handler→service→repository→domain đúng; DTO allowlist (không serialize sqlc row); upsert idempotent; lỗi qua dto.WriteError; build/vet/gofmt sạch.
- [x] **Tests** pass — Docker PG: goose up 9/9; seed 3 tỉnh/16 quận; `GET /api/provinces` 200 JSON 3 tỉnh (UTF-8 đúng); seed lần 2 vẫn 3|16 (idempotent).
- [x] **Required artifacts** — không đụng schema/money/auth/PII → n/a
- [x] **Approval** — n/a

## Scope
- **In:** `cmd/seed --master` (idempotent upsert tỉnh + quận vùng pilot: HCM, Bình Dương, Đồng Nai). Layer đọc: `domain.Province`, `repository.LocationRepository`, `service.LocationService`, `dto.ProvinceResponse` (allowlist), `handler.LocationHandler`, route `GET /api/provinces`. sqlc queries upsert + list.
- **Out:** Endpoint districts; seed demo; profile list (§12.6) — bước sau.

## Design (senior-reasoning nén)
- **Master data = seed command, KHÔNG nhét vào migration.** Lý do: Makefile đã có `seed-master`/`seed-demo` và §7.1 tách seed-master khỏi seed-demo; data trong migration cứng, khó cập nhật. §28 "migration master data" hiểu là "phải có master data được nạp" → seed idempotent thỏa yêu cầu mà vẫn cập nhật được.
- **Rủi ro non-obvious:** cải cách đơn vị hành chính VN 2025 (sáp nhập quận/tỉnh) khiến danh sách quận có thể lệch thực tế. → Seed đánh dấu rõ là **dữ liệu pilot, chỉnh sửa được**, dùng upsert nên cập nhật lại an toàn; không coi là nguồn chân lý hành chính.
- **Không serialize sqlc row ra API** (§1.5): handler map `domain.Province → dto.ProvinceResponse` (allowlist code/name/slug).
- **Layering:** handler → service → repository(sqlc) → domain. Service mỏng bây giờ nhưng là seam cho logic sau; repository map sqlcgen→domain.

## Plan (slices)
1. sqlc queries (upsert province/district, list provinces) → generate → build
2. domain + repository + service + dto + handler + wire router/main → build
3. cmd/seed --master (dữ liệu pilot, idempotent) → build
4. Verify: goose up → seed → curl /api/provinces → JSON; seed 2 lần → count không đổi → commit

## Tests to run
- `go build ./...`, `go vet ./...`
- Docker PG → `goose up` → `seed --master` → `curl /api/provinces` (JSON mảng tỉnh), `curl /api/provinces` sau seed lần 2 (count không đổi = idempotent)

## Risks & rollback
- Dữ liệu hành chính có thể lệch (xem Design) — upsert cho phép sửa lại; không phá dữ liệu khác.
- Rollback: xóa nhánh feature; seed không đụng bảng khác.

## Decisions
- Master data qua `cmd/seed --master` idempotent (upsert). Endpoint đọc theo layering đầy đủ, DTO allowlist.
