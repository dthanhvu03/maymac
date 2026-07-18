# [TASK-009] Admin: xử lý Buyer Brief (auth gate + list + transition)

- **Status:** in-review (đã commit; chờ founder duyệt merge)
- **Owner:** vuongstus
- **Branch:** feature/admin-brief-processing · **Remote:** github.com/dthanhvu03/maymac
- **Mode:** vibe

## Gate status
- [x] **Challenge** — **go** (xem Design + pre-mortem)
- [x] **Impact map** — mới: config ADMIN_API_TOKEN, middleware AdminAuth, queries admin briefs, layer transition, routes `/api/admin/*`. GHI: buyer_briefs.status + timestamps + buyer_brief_status_history. Đọc: buyer_briefs. Router thêm nhóm /api/admin (guarded), không đụng route công khai.
- [x] **Review** — auth constant-time + fail-closed; transition atomic (conditional UPDATE :execrows + history trong tx); state machine trong domain; **fix bug enum param thiếu cast `::brief_status`** (phát hiện khi chạy thật). build/vet/gofmt sạch.
- [x] **Tests** pass — unit 41→(+auth/transition/map). e2e Docker: auth 401/401/200; submitted→under_review→qualified 200; illegal→409; bogus→422; history đủ 3 mốc; qualified_at set; token KHÔNG log.
- [x] **Required artifacts** — **AUTH**: security-review + walkthrough (mục dưới) đã thực hiện; xác nhận constant-time, fail-closed, không log token, xoay token = env.
- [x] **Approval** — n/a (approver list rỗng; không đụng prod/schema)

## Ghi chú bug (evidence gate bắt được)
`UpdateBriefStatus` ban đầu dùng `$2/$3` enum không cast → pgx bind sai kiểu → 500 khi chạy thật (unit test không bắt vì không chạm DB). Sửa: `sqlc.arg(...)::brief_status` (nhất quán với `ListPublishedProfiles ::production_model`). Bài học: query có enum param PHẢI cast tường minh.

## Design (domain-model + senior-reasoning, nén)
- **Auth gate pilot:** admin token tĩnh qua env `ADMIN_API_TOKEN`, header `Authorization: Bearer <token>`. **KHÔNG** phải user/session/JWT đầy đủ (hoãn — spec có user_role nhưng V1 pilot 1 nhóm admin). Lý do: mở khóa admin ngay mà không dựng hệ thống auth lớn; ghi Decision Log.
  - **Fail-closed:** nếu `ADMIN_API_TOKEN` rỗng → mọi request admin trả 503 (không vô tình để hở).
  - So sánh **constant-time** (`subtle.ConstantTimeCompare`) chống timing attack. 401 chung chung, không lộ chi tiết. Token KHÔNG log.
- **State machine (§17.1):** transition map trong domain; transition ngoài map → **409**. Cập nhật atomic ở DB: `UPDATE ... WHERE id=$1 AND status=$from` (:execrows) — 0 dòng = status đã đổi dưới tay → 409 (guard race ở DB, không check-then-act ở app). Trong transaction + ghi history + set timestamp mốc (§12.2).
- **Pre-mortem:** hai admin đổi cùng brief đồng thời → conditional update chặn (1 thắng). Token lộ qua log → không log. Transition sai → 409. Admin chưa cấu hình → 503 fail-closed.

## Security-review + walkthrough (required — auth touch)
- Bí mật: `ADMIN_API_TOKEN` chỉ ở env, không commit, không log; `.env.example` để placeholder.
- Nếu lộ token → xoay (đổi env) là đủ vô hiệu (token tĩnh, không lưu DB).
- Kịch bản tấn công: (a) brute-force token → mitigはrate-limit (hoãn) + token đủ dài do người vận hành đặt; (b) timing attack → constant-time compare; (c) admin để trống → fail-closed 503. Rate-limit cho cả public+admin là slice riêng.
- Admin DTO có PII buyer (tên/SĐT) — hợp lệ vì operator cần liên hệ; vẫn sau cổng auth.

## Scope
- **In:** middleware AdminAuth; `GET /api/admin/buyer-briefs` (filter status + phân trang); `POST /api/admin/buyer-briefs/{token}/transition` (body {to_status, note}) theo state machine, transaction + history + timestamp. config ADMIN_API_TOKEN.
- **Out:** User/session/login thật; RBAC nhiều vai trò; audit log bảng admin_audit_logs (ghi actor — cần user thật, hoãn); rate-limit; matching/lead. → slice sau.

## Plan (slices)
1. config token + middleware AdminAuth (+ unit test) → build
2. domain transition map (+ unit test) → build
3. queries + repository (list + atomic transition tx) + service → build
4. handlers + routes guarded → build → verify e2e → commit

## Tests to run
- `go test ./...` (transition map table, auth middleware allow/deny/fail-closed)
- e2e Docker: submit 1 brief (public) → admin list (cần token; không token→401); transition submitted→under_review→qualified (200, history+timestamp); illegal submitted→closed→409; token sai→401

## Risks & rollback
- Auth là bề mặt nhạy cảm — theo security-review trên. Rollback: xóa nhánh; không đụng schema.

## Decisions
- Admin gate = static bearer token (env), fail-closed, constant-time. State machine transition atomic bằng conditional UPDATE + history trong tx.
