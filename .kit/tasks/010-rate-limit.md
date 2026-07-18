# [TASK-010] Rate-limit / anti-spam cho API công khai

- **Status:** in-progress
- **Owner:** vuongstus
- **Branch:** feature/rate-limit · **Remote:** github.com/dthanhvu03/maymac
- **Mode:** vibe

- **Status:** in-review (đã commit; chờ founder duyệt merge)

## Gate status
- [x] **Challenge** — **go** (two-way door; middleware, không schema)
- [x] **Impact map** — mới: config rate params, middleware IPRateLimiter, áp vào nhóm /api. Không đụng DB/schema. Ảnh hưởng: mọi request /api (gồm admin) chịu giới hạn; health (/healthz,/readyz) ở root KHÔNG bị giới hạn (đúng ý — monitoring).
- [x] **Review** — token-bucket x/time/rate per-IP; eviction goroutine + Close (không leak); 429+Retry-After; health không bị limit; build/vet/gofmt sạch.
- [x] **Tests** pass — unit: burst→429, per-IP isolation. e2e: burst=3 → req1-3=200, req4-6=429; /readyz=200; 429 có Retry-After + problem+json.
- [x] **Required artifacts** — không schema/money/PII/auth → n/a
- [x] **Approval** — n/a

## Design (senior-reasoning nén)
- **In-memory token-bucket per-IP** (`golang.org/x/time/rate`). KHÔNG Redis (spec §0.5 hoãn Redis). Pilot 1 instance → per-instance limiter đủ; khi scale nhiều instance sẽ chuyển shared store (ghi rõ hạn chế).
- **Eviction:** map[ip]*limiter + lastSeen; goroutine dọn entry idle > TTL (chống phình bộ nhớ). Close() dừng goroutine khi shutdown (không leak).
- **Key theo IP thật:** chi RealIP đã set RemoteAddr từ X-Forwarded-For/X-Real-IP; tách host.
- **429 + Retry-After**, body problem+json.
- **Áp ở /api** (gồm cả admin — defense in depth); health ở root không đụng.
- **Rủi ro:** X-Forwarded-For giả mạo khi không có proxy tin cậy → khi deploy sau proxy, cấu hình trusted proxy (ghi chú vận hành, hoãn). Giới hạn mặc định rộng rãi để không chặn nhầm user thật.

## Scope
- **In:** `middleware.IPRateLimiter` + `RateLimit` middleware; config `PUBLIC_RATE_LIMIT_RPM`/`_BURST`; áp vào /api; Close khi shutdown; unit test.
- **Out:** Redis/shared limiter đa-instance; rate-limit riêng theo endpoint; CAPTCHA; trusted-proxy config. → sau.

## Plan
1. go get x/time/rate + config → build
2. middleware IPRateLimiter + RateLimit → unit test
3. wire /api + main Close → build → verify e2e → commit

## Tests to run
- `go test ./...` (burst cho phép N, request N+1 → deny; IP khác độc lập)
- e2e: gọi /api/provinces nhiều lần nhanh với burst nhỏ → thấy 200… rồi 429

## Risks & rollback
- Chặn nhầm nếu limit quá chặt → mặc định rộng. Rollback: xóa nhánh (middleware độc lập).

## Decisions
- Rate-limit in-memory per-IP (x/time/rate), áp /api, eviction theo TTL, 429+Retry-After.
