# [TASK-006] Profile detail API GET /api/profiles/{slug}

- **Status:** in-review (đã commit; chờ founder duyệt merge)
- **Owner:** vuongstus
- **Branch:** feature/profile-detail-api · **Remote:** github.com/dthanhvu03/maymac
- **Mode:** vibe

## Gate status
- [x] **Challenge** — **go** (nén; xem Design)
- [x] **Impact map** — mới: queries GetPublishedProfileBySlug/ListProfileCapabilities/ResolveProfileRedirect/UpsertProfileRedirect; layer profile detail; route `GET /api/profiles/{slug}`; seed thêm 1 redirect demo. Đọc: profiles, profile_capabilities, categories, profile_slug_redirects. Router thêm route con, không phá `/api/profiles` list.
- [x] **Review** — chỉ published mới trả detail; redirect 301 một bước; DTO allowlist (contact xưởng có, aggregate nội bộ/object_key không); UpsertProfile đổi sang struct (tránh >7 param); handler tách parseProfileFilter + helper để giảm complexity; build/vet/gofmt sạch.
- [x] **Tests** pass — Docker PG + seed: detail abc→200 (2 capabilities); draft→404; slug cũ `xuong-may-cu`→301 Location canonical; unknown→404.
- [x] **Required artifacts** — không đụng schema/money/auth/PII → n/a
- [x] **Approval** — n/a

## Design (nén)
- **Invariant:** detail công khai CHỈ `published`. Không tìm thấy theo slug → thử `profile_slug_redirects` (old_slug→canonical) → **301**; không có → 404.
- **DTO allowlist:** field công khai (identity, location, contact xưởng, verification, capabilities). KHÔNG lộ aggregate nội bộ (response_rate…), object_key riêng tư.
- **Capabilities:** join category lấy tên; sort theo category. **Availability + ảnh portfolio hoãn** (Layer-2, cần time/freshness rules riêng) — query để NULL/không gồm lần này.
- Slug redirect = honor §12.8 (slug đã publish bất biến, redirect 1 bước tới canonical).

## Plan (slices)
1. queries (get by slug, list capabilities, resolve/upsert redirect) → generate → build
2. domain detail + repository + service (get + redirect resolve) + dto + handler + route → build
3. seed: thêm 1 redirect demo (old slug → abc) → verify end-to-end → commit

## Tests to run
- `go build ./...`, `go vet ./...`
- Docker PG → migrate → seed --master --demo → curl:
  - `GET /api/profiles/xuong-may-abc` → 200 + capabilities (polo, ao-thun)
  - `GET /api/profiles/xuong-nhap` (draft) → 404
  - `GET /api/profiles/<old-slug>` → 301 + Location canonical
  - `GET /api/profiles/khong-co` → 404 problem+json

## Risks & rollback
- Nhiều cột nullable → map cẩn thận (deref helper). Rollback: xóa nhánh feature.

## Decisions
- Detail = profile + capabilities (join category). Slug redirect 301. Availability/ảnh hoãn.
