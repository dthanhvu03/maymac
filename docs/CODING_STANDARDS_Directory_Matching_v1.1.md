# Coding Standards — Directory & Matching ngành gia công may mặc

> **Phiên bản:** v1.1  
> **Áp dụng cho:** Go API, PostgreSQL/sqlc, Next.js/TypeScript, admin operations, public SSR pages và coding agent.  
> **Mục tiêu:** Code dễ đọc, dễ kiểm tra, không rò dữ liệu, không phá SEO và có thể mở rộng từ pilot sang production mà không phải viết lại nền móng.

---

## 1. Nguyên tắc bắt buộc

1. **Đúng nghiệp vụ trước, abstraction sau.** Không tạo framework nội bộ khi chưa có ít nhất hai use case thực sự giống nhau.
2. **Handler không chứa business logic.** Luồng chuẩn: `handler -> service -> repository -> database`.
3. **Domain không phụ thuộc transport hoặc database.** Domain không import HTTP framework, `pgx`, `sqlc` hay Next.js types.
4. **SQL phải nhìn thấy và review được.** Dùng `sqlc`; không dùng ORM cho query nghiệp vụ chính.
5. **Public API dùng allowlist.** Không serialize trực tiếp database model hoặc `sqlc` row ra ngoài.
6. **Mọi thay đổi trạng thái quan trọng phải có transaction, history và audit.**
7. **Không tạo độ chính xác giả.** Không hard-code hoặc hiển thị điểm matching phần trăm khi chưa có model và dữ liệu đủ tin cậy.
8. **SEO là dữ liệu lâu dài.** Slug đã publish mặc định bất biến; khi buộc đổi phải có redirect 301.
9. **Dữ liệu nhạy cảm private theo mặc định.** Techpack, evidence, proof và contact riêng không được nằm trong public bucket hoặc public DTO.
10. **Không merge code khi CI đỏ.** Không bỏ qua lint/test bằng comment hoặc flag nếu chưa có lý do được ghi trong PR.

---

## 2. Phiên bản và quản lý dependency

### 2.1. Pin phiên bản

Repository phải có:

```text
go.mod / go.sum
package.json
pnpm-lock.yaml
.nvmrc hoặc .tool-versions
```

Quy tắc:

- Không dùng tag `latest` trong Dockerfile, CI hoặc production manifest.
- Không nâng major dependency trong cùng PR với feature nghiệp vụ.
- Dependency mới phải có lý do rõ ràng trong PR.
- Ưu tiên standard library và dependency đã được dùng trong dự án.
- File generated phải được tạo bằng cùng phiên bản tool trong local và CI.

### 2.2. Package manager

Frontend dùng **pnpm** và chỉ commit một lockfile:

```text
pnpm-lock.yaml
```

Không commit đồng thời `package-lock.json` hoặc `yarn.lock`.

---

## 3. Repository structure

```text
/
├── apps/
│   └── web/                       # Next.js public + admin
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── lib/
│       ├── schemas/
│       └── tests/
├── cmd/
│   ├── server/
│   │   └── main.go
│   ├── migrate/
│   ├── seed/
│   └── rebuild-profile-metrics/
├── internal/
│   ├── domain/
│   ├── service/
│   ├── repository/
│   ├── api/
│   │   ├── handler/
│   │   ├── dto/
│   │   ├── middleware/
│   │   └── router.go
│   ├── auth/
│   ├── storage/
│   ├── observability/
│   └── config/
├── db/
│   ├── migrations/
│   ├── queries/
│   ├── schema.sql
│   └── seed/
├── api/
│   └── openapi.yaml
├── scripts/
├── docs/
├── .github/workflows/
├── Makefile
└── README.md
```

### 3.1. Không tạo package chung chung

Không dùng tên:

```text
utils
helpers
common
misc
manager
```

trừ khi phạm vi đã được định nghĩa cụ thể. Ưu tiên:

```text
slug
pagination
phone
searchtext
signedurl
```

---

## 4. Naming conventions

### 4.1. Go

- Package: chữ thường, ngắn, số ít: `profile`, `lead`, `storage`.
- Exported type/function: `PascalCase`.
- Unexported: `camelCase`.
- Interface mô tả hành vi: `ProfileRepository`, `ObjectSigner`.
- Không thêm hậu tố `Impl`.
- Acronym giữ nhất quán: `ID`, `URL`, `HTTP`, `API`, `DTO`.

Đúng:

```go
type ProfileRepository interface {}
func ParseProfileID(raw string) (int64, error)
```

Không đúng:

```go
type ProfileRepositoryImpl struct{}
func ParseProfileId(raw string) int64
```

### 4.2. PostgreSQL

- Table, column, index, constraint: `snake_case`.
- Table dùng danh từ số nhiều: `profiles`, `buyer_briefs`, `lead_status_history`.
- Foreign key: `<entity>_id`.
- Timestamp: `*_at`.
- Date: `*_date`.
- Boolean: `is_*`, `has_*`, `can_*` hoặc tên trạng thái rõ nghĩa.
- Index: `idx_<table>_<purpose>`.
- Unique constraint: `uq_<table>_<columns>` khi cần đặt tên.
- Check constraint: `chk_<table>_<rule>` khi cần đặt tên.

### 4.3. TypeScript/React

- File component: `profile-card.tsx`.
- React component: `ProfileCard`.
- Hook: `useProfileFilters`.
- Zod schema: `buyerBriefSchema`.
- Type: `BuyerBriefFormValues`.
- Constant: `LEAD_STATUS_LABELS`.
- Route segment và URL: `kebab-case`.

### 4.4. API JSON

API dùng `snake_case` để đồng nhất với domain và SQL:

```json
{
  "profile_id": 123,
  "verification_level": "contact_verified",
  "updated_at": "2026-07-14T03:00:00Z"
}
```

Không trộn `camelCase` và `snake_case` trong cùng API.

---

## 5. Go coding standard

### 5.1. Format và lint

Bắt buộc chạy:

```bash
gofmt -w .
goimports -w .
golangci-lint run
```

Không tắt linter ở cấp file. `//nolint:<name>` chỉ dùng khi:

- Có lý do ngay cùng dòng.
- Lý do cụ thể, không viết “false positive” chung chung.
- PR reviewer đồng ý.

### 5.2. Function

- Một function làm một việc rõ ràng.
- Ưu tiên function dưới 50 dòng; vượt quá phải xem lại việc tách nhánh nghiệp vụ.
- Không nhận quá 5 tham số rời; dùng input struct.
- Không dùng boolean mơ hồ như `UpdateProfile(ctx, id, true, false)`.

Đúng:

```go
type PublishProfileInput struct {
    ProfileID int64
    ActorID   int64
}

func (s *ProfileService) Publish(ctx context.Context, in PublishProfileInput) error
```

### 5.3. Context

- `context.Context` luôn là tham số đầu tiên.
- Không lưu context trong struct.
- Repository và external call phải nhận context.
- Không tạo `context.Background()` bên trong request flow.

### 5.4. Error handling

- Không bỏ qua error.
- Dùng `%w` khi wrap.
- Domain error phải có sentinel hoặc typed error rõ ràng.
- Không trả raw database error ra API.
- Không dùng panic cho lỗi dữ liệu hoặc lỗi người dùng.

```go
var ErrProfileNotFound = errors.New("profile not found")

return fmt.Errorf("load profile %d: %w", profileID, err)
```

Mapping HTTP nằm ở handler/error middleware:

```text
ErrNotFound        -> 404
ErrConflict        -> 409
ErrValidation      -> 422
ErrForbidden       -> 403
ErrUnauthorized    -> 401
unknown error      -> 500
```

### 5.5. Logging

Dùng structured logging. Mỗi request log tối thiểu:

```text
request_id
method
route
status
latency_ms
actor_id khi có
```

Business log quan trọng:

```text
entity_type
entity_id
action
from_status
to_status
```

Không log:

- Buyer phone đầy đủ.
- Review author phone/email.
- Techpack URL ký.
- Access token, session cookie.
- Evidence/proof contents.

### 5.6. Service layer

Service chịu trách nhiệm:

- Business validation.
- Authorization nghiệp vụ.
- Transaction boundary.
- State transition.
- Audit/history.
- Gọi repository/storage/notifier.

Service không biết HTTP status code.

### 5.7. Repository layer

Repository:

- Không chứa HTTP DTO.
- Không quyết định authorization.
- Không tự mở transaction khi service đã truyền transaction handle.
- Trả domain model hoặc repository result chuyên biệt.
- Không trả `map[string]any` cho query có schema ổn định.

---

## 6. Transaction standard

### 6.1. Khi nào bắt buộc transaction

Bắt buộc dùng transaction cho:

- Thay đổi `lead.current_status` + status history + timestamp.
- Publish/archive profile + audit log.
- Import commit nhiều bảng.
- Qualification brief + history/audit liên quan.
- Tạo match + lead.
- Lưu outcome + rebuild/schedule aggregate.
- Đổi slug + tạo redirect.

### 6.2. Pattern

```go
err := s.tx.WithTx(ctx, func(qtx repository.Querier) error {
    if err := qtx.UpdateLeadStatus(ctx, params); err != nil {
        return fmt.Errorf("update lead status: %w", err)
    }
    if err := qtx.InsertLeadStatusHistory(ctx, history); err != nil {
        return fmt.Errorf("insert lead history: %w", err)
    }
    return nil
})
```

Quy tắc:

- Transaction ngắn.
- Không gọi network, Zalo, email hoặc S3 trong transaction.
- External notification chỉ chạy sau commit.
- **Không dựng outbox trong Phase 1.** V1 vận hành concierge và notification còn thủ công.
- Chỉ thêm outbox khi có side effect tự động cần retry chắc chắn sau commit; quyết định này phải có ADR.

---

## 7. PostgreSQL và migration standard

### 7.1. Migration

Tên file:

```text
20260714112835_create_master_data.sql
20260714113210_create_profiles.sql
20260714114542_create_capabilities.sql
```

Định dạng bắt buộc: `YYYYMMDDHHMMSS_description.sql`.
Migration phải được tạo bằng command/script chuẩn của repository; không tự gõ timestamp thủ công.

Quy tắc:

- Một migration có một mục tiêu rõ ràng.
- Migration đã chạy production không được sửa nội dung.
- Rollback production bằng migration forward mới.
- Migration phải chạy được trên database rỗng trong CI.
- Seed master data tách khỏi seed demo.
- Không dùng `DROP ... CASCADE` trong production migration nếu chưa review tác động.

### 7.2. Kiểu dữ liệu

- ID nội bộ: `BIGINT GENERATED ALWAYS AS IDENTITY`.
- Public token: chuỗi opaque, random, không dùng ID tuần tự.
- Money chưa cần tính toán chính xác: lưu note; khi có tiền tệ thật dùng số nguyên đơn vị nhỏ nhất + currency code.
- Timestamp: `TIMESTAMPTZ`, lưu UTC.
- Ngày nghiệp vụ không có giờ: `DATE`.
- **Business timezone:** `Asia/Ho_Chi_Minh`.
- Mọi logic biên ngày như “deadline quá khứ”, báo cáo theo ngày, verified trong N ngày và chuyển `DATE` thành instant phải dùng giờ Việt Nam.
- Không dựa vào timezone mặc định của database/session; truyền `business_today` từ Go khi query cần so sánh ngày nghiệp vụ.
- `valid_until > now()` vẫn dùng instant UTC khi `valid_until` là thời điểm cụ thể.
- Tỷ lệ: định nghĩa rõ 0–100 hay 0–1; dự án này dùng 0–100.

### 7.3. `updated_at`

Mọi bảng mutable có `updated_at` phải dùng trigger chung:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Không phụ thuộc extension `moddatetime`.

### 7.4. Connection pool và query timeout

Backend dùng `pgxpool` và cấu hình qua environment:

```text
DB_MAX_CONNS
DB_MIN_CONNS
DB_MAX_CONN_LIFETIME
DB_STATEMENT_TIMEOUT
DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT
```

Quy tắc:

- Không hard-code pool size; tính theo giới hạn Neon và số instance.
- Mọi request/query có context timeout phù hợp.
- Thiết lập `statement_timeout` để search/crawler không chiếm connection vô hạn.
- Thiết lập `idle_in_transaction_session_timeout`.
- Không giữ transaction trong lúc render, upload hoặc gọi network.

### 7.5. Foreign key và delete behavior

Phải chỉ định rõ `ON DELETE`:

- Dữ liệu con thuần túy: `CASCADE`.
- Master data đang được dùng: `RESTRICT`.
- Actor/audit reference: `SET NULL`.

Không để mặc định nếu hành vi xóa có ý nghĩa nghiệp vụ.

### 7.6. Check constraint

Business invariant đơn giản phải được bảo vệ ở DB:

```sql
CHECK (valid_until > confirmed_at)
CHECK (usual_max_order_qty >= usual_min_order_qty)
CHECK (estimated_quantity > 0)
```

Validation ở API không thay thế constraint database.

---

## 8. sqlc query standard

### 8.1. File query theo bounded context

```text
db/queries/profiles.sql
db/queries/capabilities.sql
db/queries/buyer_briefs.sql
db/queries/leads.sql
db/queries/reviews.sql
```

### 8.2. Tên query

```sql
-- name: GetProfileBySlug :one
-- name: ListPublishedProfiles :many
-- name: InsertLeadStatusHistory :exec
```

Dùng động từ nhất quán:

```text
Get
List
Create
Update
Delete
Count
Exists
```

### 8.3. Capability filtering bắt buộc dùng `EXISTS`

Không dùng `JOIN + DISTINCT` để filter list profile.

Đúng:

```sql
SELECT p.*
FROM profiles p
WHERE p.status = 'published'
  AND (
    sqlc.narg(category_id)::bigint IS NULL
    OR EXISTS (
      SELECT 1
      FROM profile_capabilities pc
      WHERE pc.profile_id = p.id
        AND pc.category_id = sqlc.narg(category_id)
        AND (
          sqlc.narg(production_model)::production_model IS NULL
          OR pc.production_model = sqlc.narg(production_model)
        )
    )
  )
ORDER BY p.featured DESC, p.id DESC
LIMIT sqlc.arg(page_size)
OFFSET sqlc.arg(page_offset);
```

Không đúng:

```sql
SELECT DISTINCT p.*
FROM profiles p
JOIN profile_capabilities pc ON pc.profile_id = p.id
...
```

### 8.4. Sort và pagination

- Sort luôn deterministic.
- Luôn có tie-break bằng `p.id`.
- Public SEO list V1 dùng `page` + `per_page`.
- `per_page` mặc định 20, tối đa 50.
- Query count tách riêng nếu UI cần tổng trang.
- Khi dữ liệu lớn mới chuyển endpoint phù hợp sang cursor pagination.

### 8.5. Current availability

Lấy record còn hiệu lực mới nhất bằng lateral subquery hoặc subquery có thứ tự rõ ràng. Không giả định record cuối theo ID là record hiện tại.

### 8.6. Batch loading cho list card

Không query ảnh, category, capability hoặc availability bên trong vòng lặp profile.
Pattern bắt buộc:

```text
Query 1: page profiles
Query 2: capabilities/categories WHERE profile_id = ANY($1)
Query 3: cover images WHERE profile_id = ANY($1)
Query 4: current availability WHERE profile_id = ANY($1) khi card cần
```

Gom kết quả trong Go theo `profile_id`.
Số query cho một page phải cố định, không tăng theo số profile.
Có thể dùng aggregate cho detail query, nhưng không biến list query thành một câu SQL khổng lồ khó review.

---

## 9. Search standard

### 9.1. Search document

`profiles.search_text` là normalized materialized text, gồm:

- Profile name.
- Province/district name.
- Address.
- Category.
- Production model.
- Capability note.
- Materials note.

Chỉ có **một implementation chuẩn** trong Go:

```go
package searchtext

func Normalize(input string) string
```

Hàm này bắt buộc dùng cho cả hai chiều:

- Khi xây/cập nhật `profiles.search_text`.
- Khi normalize query `q` của người dùng.
- Khi import dữ liệu.
- Khi update profile/capability.
- Khi chạy command rebuild.

Không viết thêm bản normalize tương đương trong SQL hoặc frontend.
Quy tắc normalize:

```text
lowercase
remove Vietnamese accents
collapse whitespace
remove irrelevant punctuation
```

Test fixture phải bao phủ tiếng Việt, dấu gạch, slash và whitespace bất thường.

### 9.2. Rebuild

Phải có command idempotent:

```text
cmd/rebuild-profile-search-text
```

Import hoặc update capability phải cập nhật/search rebuild profile liên quan.

### 9.3. Không concatenate SQL động từ input

Sort key phải map qua allowlist trong Go. Không truyền raw `sort` vào câu SQL.

---

## 10. API contract standard

### 10.1. OpenAPI là contract nguồn

Tất cả public/admin endpoint phải được mô tả trong:

```text
api/openapi.yaml
```

PR thay đổi API phải cập nhật OpenAPI cùng lúc.

### 10.2. Response envelope

Single resource:

```json
{
  "data": {}
}
```

Collection:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 42
  }
}
```

### 10.3. Error format

Dùng `application/problem+json`:

```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "One or more fields are invalid",
  "request_id": "req_...",
  "errors": {
    "estimated_quantity": ["must be greater than zero"]
  }
}
```

Không trả stack trace hoặc raw SQL error.

### 10.4. HTTP semantics

- `GET`: không thay đổi state.
- `POST`: create/action.
- `PATCH`: partial update.
- `DELETE`: chỉ dùng khi nghiệp vụ thực sự xóa; archive dùng action/status.
- `201`: create thành công.
- `204`: action thành công không có body.
- `409`: conflict/state transition không hợp lệ.
- `422`: input đúng JSON nhưng không hợp lệ nghiệp vụ.

### 10.5. Public/private DTO

Public profile DTO chỉ chứa field được phép công khai.

Tuyệt đối không trả:

```text
proof_object_key
evidence_object_key
ip_hash
reviewer_phone
reviewer_email
private buyer feedback
private factory feedback
internal moderation note
signed URL đã hết hạn hoặc object key private
```

### 10.6. Public identifiers

- Public route dùng slug hoặc opaque token.
- Không dùng sequential database ID trong URL công khai cho brief/lead.
- Token phải đủ entropy và có thể revoke/rotate khi cần.

---

## 11. Idempotency standard

Public POST/action có nguy cơ retry hoặc double-submit phải hỗ trợ `Idempotency-Key` hoặc `submission_token` opaque:

- Tạo/submit Buyer Brief.
- Gửi review.
- Action lead có thể retry.
- Import commit.

Quy tắc:

- Unique theo `(scope, idempotency_key_hash)`.
- Cùng key + cùng request payload trả lại kết quả cũ.
- Cùng key + payload khác trả `409 Conflict`.
- Không dedupe chủ yếu bằng số điện thoại vì một buyer có thể gửi nhiều yêu cầu thật.
- Contact analytics là best-effort, có thể dedupe mềm theo session/event window.
- Import dùng `import_batch_id`; commit lại cùng batch không được nhân đôi dữ liệu.

---

## 12. Authentication và authorization

### 12.1. Quy tắc

- Authentication trả lời “ai đang gọi”.
- Authorization trả lời “người này được làm gì với entity này”.
- Không chỉ ẩn nút ở frontend; backend luôn kiểm tra quyền.

### 12.2. Role V1

```text
admin
operator
editor
user
```

Gợi ý:

- `admin`: toàn quyền vận hành.
- `operator`: brief, matching, lead, outcome.
- `editor`: profile, portfolio, capability.
- `user`: public authenticated features khi có.

### 12.3. Lead public token

Lead portal bằng token phải:

- Chỉ hiển thị tối thiểu dữ liệu cần thiết.
- Có rate limit.
- Không cho enumerate.
- Có khả năng expire/revoke.
- Không lộ attachment nếu chưa cấp quyền riêng.

---

## 13. Storage và file security

### 13.1. Bucket separation

```text
public-assets
private-documents
```

Public:

- Portfolio đã duyệt.
- Thumbnail.
- Open Graph image.

Private:

- Buyer brief attachment.
- Techpack.
- Review proof.
- Verification evidence.
- Tài liệu nội bộ.

### 13.2. Database lưu object key

Đúng:

```text
buyer-briefs/2026/07/<uuid>/techpack.pdf
```

Không lưu signed URL vào database.

### 13.3. Signed URL

- Tạo theo request sau authorization.
- Thời hạn ngắn.
- Không ghi signed URL vào log.
- Download name phải sanitize.
- Kiểm tra MIME, extension và size; không tin MIME từ client.

---

## 14. Next.js và TypeScript standard

### 14.1. TypeScript strict

Bắt buộc:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Không dùng `any`. Nếu dữ liệu chưa biết, dùng `unknown` và parse bằng Zod.

### 14.2. Server Components mặc định

- Public profile/list/collection dùng Server Components.
- Chỉ thêm `'use client'` tại component nhỏ nhất cần interaction.
- Không biến toàn page thành client component chỉ để dùng một filter hoặc button.

### 14.3. Data fetching

- SSR/ISR page fetch ở server.
- TanStack Query dùng cho client mutation, admin dynamic data hoặc polling.
- Không fetch cùng dữ liệu hai lần ở server và client nếu không cần.
- Cache/revalidate phải được đặt theo độ mới của dữ liệu.

### 14.4. Form

- `react-hook-form` + Zod.
- Schema là nguồn validation client.
- Backend vẫn validate lại độc lập.
- Error hiển thị gần field và có summary khi form dài.
- Buyer Brief autosave không lưu file binary vào local storage.

### 14.5. Component boundaries

Ưu tiên feature-based:

```text
features/profiles/
features/buyer-briefs/
features/leads/
features/matching/
```

Component chung chỉ đưa vào `components/` khi thực sự được dùng ở nhiều feature.

### 14.6. Accessibility

- Form field có label thật.
- Button không chỉ có icon nếu thiếu accessible name.
- Dialog quản lý focus.
- Keyboard dùng được cho filter và admin actions.
- Không dùng màu làm tín hiệu trạng thái duy nhất.

---

## 15. Contact event tracking

CTA gọi điện/Zalo không được chờ analytics API.

```ts
function trackContactEvent(payload: ContactEventPayload) {
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/contact-events', body);
    return;
  }

  void fetch('/api/contact-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  });
}
```

Quy tắc:

- Gửi event rồi mở `tel:`/Zalo ngay.
- Không `await` tracking.
- Tracking lỗi không được chặn CTA.
- Backend deduplicate hợp lý bằng session/event window nếu cần.

---

## 16. Slug và SEO standard

### 16.1. Slug immutable sau publish

- Draft có thể regenerate slug.
- Sau lần publish đầu tiên, đổi tên không tự đổi slug.
- Khi buộc đổi: transaction cập nhật slug + insert `profile_slug_redirects` theo `old_slug -> profile_id`.
- Redirect handler luôn resolve `profiles.slug` hiện tại từ `profile_id`.
- Không lưu `target_slug` trong redirect table; mọi slug cũ phải 301 **một bước** đến canonical hiện tại.
- Old slug trả 301 sang canonical slug.

### 16.2. Metadata

Mỗi public profile phải có:

- Unique title.
- Meta description.
- Canonical URL.
- Open Graph image.
- Structured data phù hợp.

`AggregateRating` chỉ xuất khi review đủ điều kiện và không gây hiểu nhầm.

### 16.3. Filter pages

- Không index filter combination mỏng.
- Chỉ index category/location landing page được biên tập và có nội dung đủ.
- Pagination có canonical hợp lý; không canonical tất cả page về page 1 nếu nội dung khác.

---

## 17. State machine standard

### 17.1. Brief và lead là hai vòng đời độc lập

Không dùng chung enum hoặc tên type giữa Buyer Brief và Lead.
Dùng tên đầy đủ trong Go, ví dụ `BriefStatusQualified`, `LeadStatusResponded`.

**Buyer Brief:**

```text
draft -> submitted
submitted -> under_review | cancelled
under_review -> needs_information | qualified | rejected | cancelled
needs_information -> under_review | cancelled
qualified -> matching | rejected | cancelled
matching -> matched | rejected | cancelled
matched -> closed | cancelled
rejected/cancelled/closed -> terminal
```

**Lead** — chỉ được tạo cho một cặp `brief x profile` sau khi có match:

```text
created -> sent | lost
sent -> viewed | responded | lost | expired
viewed -> responded | lost | expired
responded -> quoted | lost | expired
quoted -> sample_started | won | lost | expired
sample_started -> won | lost | expired
won/lost/expired -> terminal
```

Quy tắc:

- `brief_matches` đại diện cho shortlist; không dùng `lead.status = shortlisted`.
- Không có `lead.status = qualified`.
- `viewed` là tín hiệu quan sát, không phải bước bắt buộc; `sent -> responded` hợp lệ.
- Transition ngoài map trả `409 Conflict`.
- Mỗi entity có history table riêng và cập nhật cùng transaction.

### 17.2. Timestamp tương ứng

Buyer Brief:

- `submitted` -> `submitted_at` lần đầu.
- `under_review` -> `reviewed_at` lần đầu.
- `qualified` -> `qualified_at` lần đầu.
- `matched` -> `matched_at` lần đầu.
- `rejected` -> `rejected_at`.
- `cancelled` -> `cancelled_at`.
- `closed` -> `closed_at`.

Lead:

- `sent` -> `sent_at`.
- `viewed` -> `viewed_at` lần đầu.
- `responded` -> `first_response_at` lần đầu.
- `quoted` -> `quoted_at`.
- `sample_started` -> `sample_started_at`.
- `won` -> `won_at`.
- `lost` -> `lost_at`.
- `expired` -> `expired_at`.

Không overwrite timestamp có nghĩa “first” khi event lặp lại.

---

## 18. Review standard V1

- Không xây SMS OTP/email OTP trong V1.
- Review vào moderation queue.
- Operator xác minh thủ công bằng lead, cuộc gọi, Zalo hoặc bằng chứng private.
- `verification_status` và `status` là hai khái niệm riêng.
- Proof lưu private object storage.
- Reviewer contact chỉ admin thấy.
- Không publish accusation nghiêm trọng khi chưa có bằng chứng và quy trình xử lý.

Bayesian rating nếu cần dùng cho sort/report phải **tính tại query/report time**, không lưu `weighted_rating` thành cột materialized ở V1.

---

## 19. Validation standard

Validation có ba tầng:

1. **Transport:** JSON shape, required field, enum.
2. **Business:** deadline, transition, quyền, availability freshness.
3. **Database:** FK, unique, check constraint.

Ví dụ Buyer Brief:

- `estimated_quantity > 0` ở Zod, Go validator và DB check.
- Deadline quá khứ theo `Asia/Ho_Chi_Minh` trả 422; không so bằng UTC date mặc định.
- Category không active trả 422.
- File vượt size hoặc loại file cấm trả 422 trước upload commit.

---

## 20. Security baseline

Bắt buộc:

- Validate mọi input.
- Parameterized SQL qua sqlc/pgx.
- Rate limit public form, review, contact event và token portal.
- Phase 1 một instance dùng in-memory token bucket sau interface `RateLimiter`; không thêm Redis sớm.
- Khi chạy nhiều instance mới thay rate-limit backend bằng shared store.
- CSRF protection nếu dùng cookie auth cho mutation.
- Secure, HttpOnly, SameSite cookie.
- CORS allowlist; không dùng `*` với credential.
- Secrets chỉ qua environment/secret manager.
- Không commit `.env`.
- Upload filename không dùng làm storage path trực tiếp.
- Escape/sanitize rich text; V1 ưu tiên plain text/Markdown allowlist.
- Security headers cho Next.js.
- Audit admin action có actor, entity, before/after phù hợp.

---

## 21. Testing standard

### 21.1. Test pyramid

Bắt buộc có:

1. Unit test domain/service.
2. Repository integration test trên PostgreSQL thật.
3. Handler/API test.
4. E2E cho critical flow.

### 21.2. Critical test cases

#### Profiles/search

- Capability filter không nhân profile.
- Filter category mà không truyền production model.
- Multiple capability vẫn trả một profile.
- Sort deterministic qua nhiều page.
- District thuộc đúng province.
- Search không dấu.
- Cùng `searchtext.Normalize` được dùng khi ghi index và khi xử lý query.
- List card dùng số query cố định, không N+1.

#### Slug

- Đổi tên profile published không đổi slug.
- Forced slug change tạo redirect.
- Old slug trả 301.
- Đổi slug A -> B -> C thì `/A` và `/B` đều redirect một bước đến `/C`.

#### Buyer Brief

- Brief và lead dùng enum/type riêng.
- `needs_information -> under_review` hợp lệ.
- History và timestamp brief được ghi cùng transaction.

#### Lead

- Không có trạng thái `shortlisted` hoặc `qualified`.
- `sent -> responded` hợp lệ dù chưa ghi nhận viewed.
- `responded/quoted/sample_started -> expired` hợp lệ.
- Transition không hợp lệ trả conflict.
- History và timestamp được ghi cùng transaction.
- Rollback nếu insert history thất bại.

#### Privacy

- Public DTO không chứa private field.
- Signed URL chỉ được tạo sau authorization.
- Lead token không xem được lead khác.

#### Tracking

- Contact CTA vẫn hoạt động khi tracking endpoint lỗi.

### 21.3. Coverage

- `domain` và `service`: tối thiểu 80% line coverage.
- Không dùng coverage làm lý do để viết test vô nghĩa.
- Critical state transitions và permission rules phải 100% case coverage theo decision table.

### 21.4. Test naming

Go:

```go
func TestLeadService_Transition_RejectsInvalidTransition(t *testing.T)
```

Frontend:

```text
profile-filter.spec.ts
buyer-brief-form.spec.ts
```

---

## 22. CI quality gate

Mỗi PR phải chạy:

```text
backend format check
backend lint
backend unit tests
repository integration tests
sqlc generate diff check
migration on empty database
migration on previous schema snapshot
frontend format/lint
typecheck
frontend tests
build
OpenAPI validation
secret scan
```

Merge bị chặn nếu:

- Generated code khác sau khi chạy generator.
- Migration fail.
- OpenAPI không hợp lệ.
- Test hoặc lint fail.
- Có secret nghi ngờ.

---

## 23. Git workflow

### 23.1. Branch

```text
main
  production-ready

dev
  integration branch

feature/<ticket>-<short-name>
fix/<ticket>-<short-name>
hotfix/<ticket>-<short-name>
```

### 23.2. Commit convention

```text
feat: add capability filters with exists query
fix: prevent published slug regeneration
refactor: extract lead transition policy
chore: update sqlc generation config
test: add lead rollback integration test
docs: document private evidence policy
```

Commit phải:

- Một ý nghĩa chính.
- Không chứa generated noise không liên quan.
- Không dùng “update”, “fix bug”, “done” làm message độc lập.

### 23.3. Pull request

PR phải có:

```text
What changed
Why
How tested
Migration impact
API impact
Security/privacy impact
Screenshots nếu có UI
Rollback/forward-fix plan nếu có migration rủi ro
```

Ưu tiên PR dưới khoảng 500 dòng logic thay đổi. PR lớn phải chia theo migration, backend contract và UI khi có thể.

---

## 24. Code review checklist

Reviewer phải kiểm tra:

### Architecture

- Handler có chứa business logic không?
- Domain có import database/HTTP package không?
- Transaction boundary đúng chưa?

### Data

- FK/delete behavior rõ chưa?
- Có cần check/unique constraint không?
- Query có nhân dòng hoặc N+1 không?
- Sort có deterministic không?

### Security

- DTO có lộ private field không?
- Upload/object key có an toàn không?
- Authorization có ở backend không?
- Log có PII không?

### Product

- Có tạo metric/score gây hiểu nhầm không?
- Availability có kiểm tra `valid_until` không?
- Slug/SEO có bị ảnh hưởng không?

### Quality

- Có test failure path không?
- Error có wrap context không?
- OpenAPI/docs có cập nhật không?

---

## 25. Definition of Done cho một task code

Task chỉ được coi là hoàn thành khi:

- Code đúng layer và naming standard.
- Có migration/query nếu cần.
- Có test cho happy path và failure path quan trọng.
- Không lộ private data qua API/log.
- OpenAPI cập nhật nếu contract đổi.
- UI có loading, empty, error state.
- Accessibility cơ bản đạt.
- CI xanh.
- Không còn TODO không gắn ticket.
- PR mô tả cách test và tác động dữ liệu.

---

## 26. Quy tắc dành cho coding agent

Coding agent bắt buộc:

1. Đọc Product Spec và Coding Standards trước khi sửa code.
2. Không tự thay stack hoặc thêm ORM.
3. Không tự mở rộng scope sang payment, chat, AI matching hoặc account đầy đủ.
4. Không dùng `JOIN + DISTINCT` cho capability filter.
5. Không serialize database row trực tiếp ra public API.
6. Không tạo public URL cho private object.
7. Không thay slug profile published khi đổi name.
8. Không cập nhật lead status nếu thiếu history trong cùng transaction.
9. Không bỏ qua test/lint để hoàn thành task.
10. Không dùng chung trạng thái giữa Buyer Brief và Lead; không tạo lead ở trạng thái `shortlisted`/`qualified`.
11. Chỉ dùng `searchtext.Normalize` cho cả index và query; không viết bản SQL thứ hai.
12. Không query capability/ảnh trong vòng lặp profile; dùng batch load với `ANY($ids)`.
13. Không dựng outbox hoặc Redis rate limit trong Phase 1 nếu chưa có ADR.
14. Khi spec chưa rõ, chọn phương án đơn giản nhất có thể đảo ngược và ghi assumption trong PR.

### 26.1. Output tối thiểu của coding agent

Mỗi task phải báo:

```text
Files changed
Behavior implemented
Database/API changes
Tests added and run
Assumptions
Known limitations
```

---

## 27. Lệnh chuẩn dự kiến

`Makefile` phải cung cấp giao diện thống nhất:

```bash
make setup
make dev
make fmt
make lint
make test
make test-integration
make generate
make migrate-up
make migrate-status
make seed-master
make seed-demo
make openapi-validate
make ci
```

Tên tool cụ thể có thể thay đổi bên trong, nhưng command dành cho team và CI phải ổn định.

---

## 28. Chốt kỹ thuật Phase 1

Phase 1 chỉ được bắt đầu khi repository có:

- Skeleton đúng cấu trúc.
- Migration master data gồm province + district.
- Trigger `updated_at` dùng chung.
- sqlc config và generation command.
- OpenAPI skeleton.
- Error middleware theo Problem Details.
- Request ID + structured logging.
- Public DTO allowlist.
- Profile list query dùng `EXISTS`.
- Slug immutable policy + redirect table resolve theo `profile_id`.
- Buyer Brief và Lead có enum + history table độc lập.
- `searchtext.Normalize` duy nhất cho write/query.
- Business timezone `Asia/Ho_Chi_Minh` và test biên ngày.
- Batch-load query cho profile cards, không N+1.
- Idempotency cho public form và `import_batch_id`.
- `pgxpool`, `statement_timeout`, request timeout.
- Private attachment lưu `object_key`, không lưu signed URL.
- Test database trong CI.
- Backend/frontend lint và typecheck.

> Các chuẩn trên là mặc định bắt buộc. Ngoại lệ phải được ghi rõ trong ADR hoặc PR, có lý do, phạm vi và kế hoạch xử lý về sau.
