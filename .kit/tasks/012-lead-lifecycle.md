# [TASK-012] Vòng đời Lead (transition + outcome lost_reason)

- **Status:** in-progress
- **Owner:** vuongstus
- **Branch:** feature/lead-lifecycle · **Remote:** github.com/dthanhvu03/maymac
- **Mode:** vibe

- **Status:** in-review (đã commit; chờ founder duyệt merge)

## Gate status
- [x] **Challenge** — **go** (dùng lại pattern brief transition đã proven; xem Design)
- [x] **Impact map** — mới: domain lead map, queries lead transition/outcome, repo+service transition, route `POST /api/admin/leads/{token}/transition`. GHI: leads.current_status + timestamps + lead_status_history + lead_outcomes. Đọc: leads. Không đụng route cũ.
- [x] **Review** — state machine trong domain; conditional UPDATE atomic (:execrows) + history + timestamp + outcome trong 1 tx; enum cast ::lead_status (áp bài học TASK-009); lost bắt buộc reason; build/vet/gofmt sạch.
- [x] **Tests** pass — unit 56 (lead map, lost-needs-reason, transition service). e2e: walk created→…→won (200, history đủ, won_at set); won→lost 409; nhảy cóc 409; lost thiếu reason 422; lost có reason 200 + lead_outcomes.lost_reason=price_mismatch.
- [x] **Required artifacts** — không schema mới/money/PII/auth → n/a
- [x] **Approval** — n/a

## Domain-model (Lead §17.1)
```
created→sent|lost; sent→viewed|responded|lost|expired; viewed→responded|lost|expired;
responded→quoted|lost|expired; quoted→sample_started|won|lost|expired;
sample_started→won|lost|expired; won/lost/expired = terminal
```
- Transition ngoài map → 409. Atomic ở DB (`UPDATE ... WHERE id AND current_status=from`, :execrows, 0 dòng→409) + history + set timestamp mốc, trong transaction (§12.3).
- **lost bắt buộc lost_reason** (enum lead_lost_reason) → ghi `lead_outcomes` (upsert theo lead_id UNIQUE). Đây là Outcome Data (vì sao mất lead) — lõi giá trị.
- Enum param trong UPDATE PHẢI cast `::lead_status` (bài học TASK-009).

## Design (nén)
- Mirror brief transition (đã proven): service load (id, from) → CanTransitionLead → repo transition tx. lost → validate lost_reason (422 nếu thiếu/sai) → upsert outcome trong cùng tx.
- **Pre-mortem:** hai admin đổi cùng lead → conditional update chặn. lost không lý do → 422. quên cast enum → 500 (đã phòng bằng cast).

## Scope
- **In:** `POST /api/admin/leads/{token}/transition` {to_status, note, lost_reason?}; state machine; timestamps; history; lost_reason→lead_outcomes.
- **Out:** outcome đầy đủ (order_confirmed/quantity/delivery); `cmd/rebuild-profile-metrics`; expire tự động theo thời gian. → slice kế.

## Plan
1. domain lead map + lost_reason → unit test
2. queries (GetLeadByToken, UpdateLeadStatus cast, UpsertLeadOutcome) → generate
3. repo tx + service + handler + route → build → verify e2e → commit

## Tests to run
- `go test ./...`
- e2e: tạo lead(created) → transition sent→responded→quoted→won (200, timestamps+history); illegal created→won→409; lost thiếu reason→422; lost có reason→200 + lead_outcomes.lost_reason

## Risks & rollback
- Enum cast (đã phòng). Rollback: xóa nhánh; không đụng schema.

## Decisions
- Lead transition atomic + history + timestamp; lost bắt buộc lost_reason ghi lead_outcomes; enum cast ::lead_status.
