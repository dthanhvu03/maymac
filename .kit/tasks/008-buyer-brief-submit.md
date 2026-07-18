# [TASK-008] Buyer Brief submit POST /api/buyer-briefs

- **Status:** in-review (đã commit; chờ founder duyệt merge)
- **Owner:** vuongstus
- **Branch:** feature/buyer-brief-submit · **Remote:** github.com/dthanhvu03/maymac
- **Mode:** vibe

## Gate status
- [x] **Challenge** — **go** (xem Design + pre-mortem)
- [x] **Impact map** — mới: queries buyer_briefs/idempotency, internal/token, layer brief, route `POST /api/buyer-briefs`. **GHI (public write)**: buyer_briefs, buyer_brief_items, buyer_brief_status_history, idempotency_records. Đọc: (FK) categories/provinces/districts. Không caller cũ bị ảnh hưởng.
- [x] **Review** (pass 1) — layering đúng; transaction all-or-nothing; idempotency guard ở DB (UNIQUE + unique-violation replay); validate ở biên; DTO chỉ trả token+status; build/vet/gofmt sạch.
- [x] **Tests** pass — unit 29/29 (validation 7 case, service gọi/không gọi store, token). e2e Docker: submit 201; replay cùng key→200 cùng token; khác body→409; thiếu items→422; DB chỉ 2 brief (không trùng); history 2; log KHÔNG chứa SĐT.
- [x] **Required artifacts** — **PII walkthrough** (mục dưới) + **review pass 2**: xác nhận (a) không log tên/SĐT (grep log=0), (b) response không phản chiếu PII (chỉ public_token+status), (c) public_token random không đoán được, (d) idempotency chống double-submit tạo lead trùng. Chưa có auth/rate-limit (V1, ghi rõ) → slice sau.
- [x] **Approval** — n/a (approver list rỗng; không đụng prod/schema)

## Domain-model (Buyer Brief)
- State machine (§17.1): `draft→submitted→under_review→needs_information⇄under_review→qualified→matching→matched→closed`; rejected/cancelled sớm. **Public submit tạo thẳng `submitted`** (history null→submitted). Transition ngoài map → 409 (áp cho admin sau).
- Invariant: mọi thay đổi status = transaction + 1 dòng history + set timestamp (§12.2). Brief ≠ Lead (enum riêng).

## Reliability (high-stakes: public write, chống double-submit)
- **Idempotency**: header `Idempotency-Key`. Lookup `idempotency_records (scope,key_hash)`; trùng key + trùng request_hash → **replay** (trả public_token cũ, 200); trùng key khác body → **409**. Guard ở DB bằng UNIQUE(scope,key_hash) — 2 request đồng thời: 1 thắng, 1 replay.
- **Transaction**: insert brief + items + history (+ idem record) all-or-nothing.
- **Validate ở biên**: bắt buộc buyer_name, buyer_phone, ≥1 item (category_id + estimated_quantity>0) → 422 problem+json field errors. §6.3: không ép mọi chi tiết → các trường khác optional.
- **Pre-mortem:** double-submit tạo 2 brief → idempotency key + UNIQUE chặn. Body rác → validation 422. FK sai (category không tồn tại) → tx rollback, trả 422.

## PII walkthrough (required artifact)
Endpoint nhận tên + SĐT/Zalo buyer (PII). Bảo vệ: KHÔNG log SĐT/tên (chỉ log public_token + status); public_token là khóa tra cứu, không dùng id tuần tự; response chỉ trả public_token + status (không phản chiếu PII). Không có auth ở V1 (brief công khai gửi vào), rate-limit/anti-spam để slice sau.

## Scope
- **In:** `POST /api/buyer-briefs` (JSON): buyer info + optional (deadline/production_model/sample/location/notes) + items[] (category_id, estimated_quantity, colors/material note). Validation, idempotency, transaction, trả {public_token, status}. `internal/token`.
- **Out:** Upload attachment (cần storage/signed URL); admin lifecycle transitions; GET brief theo token; rate-limit. → slice sau.

## Plan (slices)
1. queries (brief/item/history, idempotency) → generate → build
2. internal/token → unit test
3. layer brief (domain/repo tx/service validate/dto/handler) + route → build
4. unit test (validation + idempotency replay/conflict) → verify e2e (curl) → commit

## Tests to run
- `go test ./...`
- e2e Docker: submit hợp lệ → 201 {public_token}; submit lại cùng Idempotency-Key → cùng token (không tạo brief mới, đếm bảng); body thiếu field → 422; cùng key khác body → 409

## Risks & rollback
- Map date/enum nullable (pgtype) cẩn thận. Rollback: xóa nhánh; không đụng schema.

## Decisions
- Idempotency-Key header + idempotency_records; submit tạo status submitted trong transaction; public_token random (internal/token).
