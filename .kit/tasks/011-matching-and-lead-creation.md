# [TASK-011] Concierge matching + tạo Lead

- **Status:** in-progress
- **Owner:** vuongstus
- **Branch:** feature/matching-lead-creation · **Remote:** github.com/dthanhvu03/maymac
- **Mode:** vibe

- **Status:** in-review (đã commit; chờ founder duyệt merge)

## Gate status
- [x] **Challenge** — **go** (xem Design + pre-mortem)
- [x] **Impact map** — mới: queries matches/leads, layer match+lead, admin routes. GHI: brief_matches, leads, lead_status_history. Đọc: buyer_briefs, profiles, brief_matches. Router thêm route admin, không đụng cái cũ.
- [x] **Review** — invariant lead-needs-match ở service; lead tạo trong tx + history; unique→409; upsert match idempotent; reasons/concerns JSONB; router refactor Handlers struct (giảm tham số); build/vet/gofmt sạch.
- [x] **Tests** pass — unit 48 (match_level, lead-needs-match 3 nhánh). e2e: match 204→list; rác→422; lead 201; dup→409; **no-match→422 (invariant §12.3)**; list leads; history=created.
- [x] **Required artifacts** — không schema mới/money/PII/auth → n/a (admin sau cổng token)
- [x] **Approval** — n/a

## Domain-model (nén)
- **brief_matches** = shortlist (buyer_brief × profile) + match_level (high/medium/low/insufficient_data) + reasons/concerns (JSONB). UNIQUE(brief,profile) → upsert (re-match cập nhật).
- **Lead** = 1 cặp (brief × profile), **CHỈ tạo sau khi có match** (§12.3). Tạo ở `created` + history null→created. UNIQUE(brief,profile) → lead trùng = 409. Lead KHÔNG có status shortlisted/qualified.
- **Invariant khóa:** không có match cho (brief,profile) → KHÔNG cho tạo lead (422).

## Design (senior-reasoning nén)
- Match & lead tạo trong transaction + history (lead). reasons/concerns lưu JSONB (spec: mỗi match ghi lý do — dữ liệu huấn luyện sau).
- **Pre-mortem:** tạo lead khi chưa match → chặn (kiểm GetBriefMatchID). Tạo lead 2 lần → UNIQUE→409. match_level rác → 422. brief không tồn tại → 404. profile sai → FK (edge, admin gửi từ list).
- Enum param INSERT VALUES suy được từ cột (không cần cast như bug UPDATE trước).

## Scope
- **In:** `POST /api/admin/buyer-briefs/{token}/matches` (upsert shortlist); `GET .../matches` (list); `POST .../leads` (tạo lead từ match); `GET /api/admin/leads` (queue). Validation + transaction + history.
- **Out:** Vòng đời Lead (sent→viewed→…→won/lost/expired) + lead_outcomes + rebuild-profile-metrics; matching tự động. → slice kế.

## Plan
1. queries matches/leads → generate → build
2. domain match/lead + repository (tx) + service (validate + invariant) → build
3. dto + handlers + routes → build → verify e2e → commit

## Tests to run
- `go test ./...` (IsMatchLevel; service tạo lead khi chưa match → lỗi validation)
- e2e Docker: qualify 1 brief → tạo match(polo profile) → list thấy match → tạo lead → 201; tạo lead khi chưa match (profile khác) → 422; tạo lại lead → 409

## Risks & rollback
- JSONB reasons/concerns map cẩn thận. Rollback: xóa nhánh; không đụng schema.

## Decisions
- Matching upsert (brief×profile); Lead tạo từ match với invariant "cần match trước"; lead public_token qua internal/token; transaction + history.
