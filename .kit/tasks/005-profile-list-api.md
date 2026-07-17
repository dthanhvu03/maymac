# [TASK-005] Profile list API (EXISTS semi-join) + demo seed

- **Status:** in-review (đã commit; chờ founder duyệt merge)
- **Owner:** vuongstus
- **Branch:** feature/profile-list-api · **Remote:** github.com/dthanhvu03/maymac
- **Mode:** vibe

## Gate status
- [x] **Challenge** — **go** (nén; xem Design)
- [x] **Impact map** — mới: categories master seed, demo seed (profiles+capabilities), queries profiles/capabilities/categories, layer profile, route `GET /api/profiles`. Đọc: profiles, profile_capabilities, categories. Ghi (seed): profiles/capabilities/categories (idempotent). Router thêm route, không phá route cũ.
- [x] **Review** — EXISTS semi-join đúng §12.6 (không JOIN+DISTINCT); count tách; sort deterministic featured/id; DTO allowlist không lộ aggregate/contact; per_page kẹp ở service; build/vet/gofmt sạch.
- [x] **Tests** pass — Docker PG: seed 4 profile (3 published+1 draft)/5 cap/5 category. 6 kịch bản curl: list=3 (draft loại); category_id=2 (polo)→abc,xyz; province=79→abc; production_model=fob→xyz; per_page=1&page=2→1 item/total 3; production_model sai→422.
- [x] **Required artifacts** — không đụng schema/money/auth/PII → n/a
- [x] **Approval** — n/a

## Design (domain-model + senior-reasoning, nén)
- **Invariant lõi:** public list CHỈ trả `status = 'published'`. Profile nháp/archived không lộ.
- **Capability filter = EXISTS** (§12.6/§8.3): kích hoạt khi có bất kỳ filter capability (category/production_model/sample/moq); mỗi filter tự null-check trong EXISTS. KHÔNG JOIN+DISTINCT (nhân dòng, sai phân trang).
- **Sort deterministic**: `featured DESC, id DESC` (tie-break id). Pagination `page`+`per_page` (default 20, max 50), count query tách.
- **List card vòng 1**: chỉ field profile-level (slug, name, kind, tagline, province_code, verification_level, featured) — **DTO allowlist**, KHÔNG lộ aggregate nội bộ (response_rate…) hay contact. Batch-loading capability/ảnh (§8.6) để lát sau.
- **Rủi ro:** OFFSET sâu chậm khi data lớn → spec chấp nhận V1, chuyển cursor sau.

## Plan (slices)
1. queries categories/profiles/capabilities → generate → build
2. seed categories (master) + demo profiles/capabilities (--demo, idempotent)
3. profile layer (domain/repo/service/dto/handler) + route → build
4. Verify end-to-end (list, filter, pagination, published-only) → commit

## Tests to run
- `go build ./...`, `go vet ./...`
- Docker PG → goose up → seed --master → seed --demo → curl:
  - `GET /api/profiles` → published profiles, phân trang
  - `?category=polo` → chỉ xưởng có capability polo (published)
  - `?province=79` → lọc theo tỉnh
  - `?per_page=1&page=2` → phân trang
  - profile status=draft KHÔNG xuất hiện

## Risks & rollback
- Dữ liệu demo là giả lập để test — rõ ràng không phải xưởng thật.
- Rollback: xóa nhánh feature; seed --demo idempotent, không phá master.

## Decisions
- Profile list dùng EXISTS narg (nullable filters), count tách; DTO card allowlist profile-level; demo seed tách khỏi master seed.
