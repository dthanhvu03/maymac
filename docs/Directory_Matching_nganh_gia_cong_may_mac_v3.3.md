# Directory & Matching ngành gia công may mặc — v3.3 Product Spec, Data Model & Pilot Operations

> **Định vị sản phẩm:** Hạ tầng dữ liệu và lớp uy tín giúp thương hiệu/shop tìm đúng xưởng dựa trên **năng lực thực tế, tình trạng nhận đơn hiện tại và lịch sử hợp tác đã xác minh**.
>
> Sản phẩm không được xem là marketplace giao dịch trong giai đoạn đầu. V1 tập trung vào ba việc:
>
> 1. Chuẩn hóa và xác minh dữ liệu xưởng.
> 2. Thu nhận yêu cầu sản xuất có cấu trúc từ buyer.
> 3. Matching thủ công, theo dõi lead và ghi nhận kết quả thực tế.
>
> **V1 không có thanh toán, escrow, đấu giá báo giá, chat nội bộ hoặc AI matching.**

---

## 0. Executive summary

### 0.1. Bài toán cần giải quyết

Buyer hiện thường tìm xưởng qua:

- Facebook group.
- Google Maps.
- Người quen giới thiệu.
- Zalo cá nhân.
- Danh sách tự tổng hợp.

Các nguồn này có thể cung cấp tên và số liên hệ, nhưng thường không trả lời được:

- Xưởng thực sự mạnh sản phẩm nào?
- MOQ hiện tại là bao nhiêu?
- Xưởng có đang nhận đơn không?
- Bao giờ có thể làm mẫu và vào chuyền?
- Xưởng đã từng xử lý đơn tương tự chưa?
- Tốc độ phản hồi và tỷ lệ đi đến báo giá thế nào?
- Dữ liệu được xác minh lần cuối khi nào?

### 0.2. Giá trị cốt lõi

Nền tảng phải tích lũy ba lớp dữ liệu:

1. **Profile Data** — xưởng là ai và có năng lực gì.
2. **Availability Data** — hiện tại có thể nhận đơn khi nào và ở mức nào.
3. **Outcome Data** — lead đã đi đến phản hồi, báo giá, làm mẫu hay đơn sản xuất chưa.

> Lớp 3 là lợi thế khó sao chép nhất. Danh bạ khác có thể sao chép tên và số điện thoại, nhưng khó có dữ liệu kết quả hợp tác đã được ghi nhận theo thời gian.

### 0.3. Nguyên tắc V1

- Dữ liệu sâu hơn dữ liệu nhiều.
- Matching thủ công trước, tự động hóa sau.
- Không hiển thị độ chính xác giả như “phù hợp 92%” khi dữ liệu chưa đủ.
- Công suất, MOQ và lead time phải có ngày xác nhận và hạn hiệu lực.
- Verification có tiêu chuẩn thống nhất; xưởng không thể mua kết quả xác minh.
- Review công khai không phải trung tâm duy nhất của uy tín.
- Kết quả lead và verified engagement quan trọng hơn lượt thích hoặc upvote.

### 0.4. Chốt kỹ thuật Phase 1 — v3.1

- Filter capability bằng correlated `EXISTS`, không dùng `JOIN + DISTINCT`.
- Province và district đều là master data.
- Review V1 xác minh thủ công; chưa dựng OTP.
- Contact event là fire-and-forget, không chặn CTA.
- Slug profile đã publish là bất biến.
- Evidence/techpack/review proof nằm ở private storage.
- Bayesian rating tính động khi cần, không lưu cột.
- `updated_at` được duy trì bằng database trigger.

### 0.5. Chốt kỹ thuật v3.3

- Buyer Brief và Lead có vòng đời, enum và history riêng; không dùng `shortlisted`/`qualified` cho Lead.
- Search chỉ dùng một hàm `searchtext.Normalize` ở Go cho cả index và query.
- Business timezone là `Asia/Ho_Chi_Minh`; timestamp lưu UTC.
- List card dùng batch loading với số query cố định, không N+1.
- Redirect slug lưu `old_slug -> profile_id`, luôn 301 một bước đến canonical hiện tại.
- Public POST và import commit có idempotency.
- Phase 1 chưa dựng outbox, Redis hoặc notification worker.
- Attachment private lưu `object_key`, không lưu signed URL.
- Backend dùng `pgxpool` với statement/request timeout.

---

## 1. Phạm vi pilot

### 1.1. Đối tượng cung cấp trong V1

Chỉ tập trung:

> **Xưởng và nhà sản xuất nhận đơn B2B cho local brand/shop.**

Không launch đồng thời:

- Thợ may cá nhân.
- Nhà cung cấp vải/phụ liệu.
- In, thêu, ép độc lập.
- Rập, nhảy size.
- QC, đóng gói, fulfillment.

Các nhóm này có thể mở thành module/category riêng sau khi workflow lõi đã ổn định.

### 1.2. Sản phẩm và khu vực ban đầu

Khuyến nghị launch hẹp:

- Sản phẩm chính: **áo thun và polo**.
- Khu vực: **TP.HCM, Bình Dương, Đồng Nai và khu vực lân cận**.
- MOQ mục tiêu: khoảng **50–1.000 sản phẩm**.
- Dữ liệu ban đầu: **30–50 hồ sơ được kiểm tra kỹ**.

Sau khi có dữ liệu và lead thật mới mở rộng sang:

- Sơ mi.
- Quần nam.
- Áo khoác.
- Các dịch vụ phụ trợ.

### 1.3. Đối tượng buyer

- Local brand.
- Shop TikTok/Shopee.
- Đơn vị thiết kế thời trang.
- Seller muốn phát triển private label.
- Doanh nghiệp cần đồng phục với MOQ vừa và nhỏ.

---

## 2. Mục tiêu và giả thuyết cần kiểm chứng

### 2.1. Mục tiêu sản phẩm

1. Buyer gửi được yêu cầu sản xuất đủ rõ để đánh giá.
2. Team shortlist được 3–5 xưởng phù hợp trong thời gian ngắn.
3. Xưởng nhận lead đúng năng lực và có khả năng phản hồi.
4. Hệ thống theo dõi được lead từ lúc gửi đến khi thắng/thua.
5. Outcome quay ngược lại cải thiện dữ liệu xưởng và matching.

### 2.2. Các giả thuyết pilot

| Giả thuyết | Cách kiểm chứng |
|---|---|
| Buyer có nhu cầu tìm xưởng thật | Có ít nhất 10–20 buyer brief đủ rõ |
| Dữ liệu giúp chọn nhanh hơn | Buyer shortlist được xưởng trong một phiên |
| Xưởng sẵn sàng nhận lead | Trên 50% lead có phản hồi |
| Lead có chất lượng | Có trao đổi sâu hoặc báo giá |
| Nền tảng tạo ra kết quả thật | Có đơn làm mẫu hoặc đơn sản xuất |
| Xưởng thấy giá trị thương mại | Có xưởng sẵn sàng trả cho portfolio, verification hoặc dashboard |

### 2.3. Không coi pageview là KPI chính

Traffic chỉ có ý nghĩa khi góp phần tạo:

```text
Qualified brief
→ shortlist
→ lead sent
→ response
→ quote
→ sample
→ order
```

---

## 3. Product principles

### 3.1. Không phải danh bạ tên và Zalo

Một hồ sơ chỉ được coi là có giá trị khi có tối thiểu:

- Loại sản phẩm chính.
- Mô hình sản xuất.
- MOQ thông thường.
- Khả năng làm mẫu.
- Lead time tham chiếu.
- Portfolio.
- Khu vực.
- Mức xác minh.
- Ngày cập nhật gần nhất.

### 3.2. Tách dữ liệu tĩnh và dữ liệu động

Không trộn:

- Năng lực thông thường của xưởng.
- Tình trạng nhận đơn trong 30–60 ngày tới.

`profile_capabilities` mô tả năng lực tương đối ổn định.

`capability_availability` mô tả tình trạng hiện tại và luôn có hạn hiệu lực.

### 3.3. Không hiển thị con số matching giả chính xác

Trong pilot không hiển thị:

```text
Độ phù hợp: 92%
```

Thay vào đó hiển thị:

```text
Phù hợp cao
- MOQ phù hợp
- Có nhận full package
- Có thể làm mẫu trước deadline
- Đã xác minh năng lực polo
- Từng xử lý đơn tương tự
```

Mức matching V1:

```text
high
medium
low
insufficient_data
```

### 3.4. Verification không được mua

Xưởng có thể trả phí để nền tảng thực hiện dịch vụ kiểm tra, nhưng:

```text
verification_service_paid = true
verification_result = passed | partial | failed
```

Hai giá trị này độc lập.

---

## 4. Ba lớp dữ liệu tạo lợi thế cạnh tranh

### 4.1. Lớp 1 — Profile Data

Dữ liệu tương đối ổn định:

- Tên, địa chỉ, người liên hệ.
- Quy mô nhân sự và chuyền may.
- Sản phẩm thế mạnh.
- Mô hình CMT/FOB/ODM/full package.
- MOQ thông thường.
- Công suất ước tính.
- Máy móc.
- Chất liệu có kinh nghiệm.
- Khả năng làm mẫu.
- Portfolio.
- Tài liệu/chứng nhận.

### 4.2. Lớp 2 — Availability Data

Dữ liệu có thời hạn:

- Có đang nhận đơn mới không.
- Ngày sớm nhất có thể làm mẫu.
- Ngày sớm nhất có thể vào chuyền.
- Mức công suất trống 30 ngày.
- Mức công suất trống 60 ngày.
- Nguồn xác nhận.
- Người xác nhận.
- Ngày xác nhận.
- Hạn hiệu lực.

### 4.3. Lớp 3 — Outcome Data

Dữ liệu từ các lead thực tế:

- Response rate.
- Median response time.
- Qualification rate.
- Quote rate.
- Sample rate.
- Order rate.
- Lost reason.
- Loại đơn thường thành công.
- Buyer repeat rate.
- On-time rate khi có dữ liệu xác minh.

Không công khai toàn bộ số liệu nhạy cảm. Public UI chỉ hiển thị dạng tổng hợp như:

- Phản hồi nhanh.
- Tỷ lệ phản hồi cao.
- Có kinh nghiệm đơn 200–500 sản phẩm.
- Đã có kết quả làm mẫu được xác minh.

---

## 5. Luồng sản phẩm V1

### 5.1. Buyer discovery flow

```text
Search/filter
→ xem profile
→ xem capability + availability + portfolio
→ lưu shortlist tạm thời hoặc gửi Buyer Brief
```

### 5.2. Buyer Brief flow

```text
draft
→ submitted
→ under_review
→ needs_information ⇄ under_review
→ qualified
→ matching
→ matched
→ closed

Có thể kết thúc sớm bằng rejected hoặc cancelled.
```

`brief_matches` đại diện cho danh sách xưởng được shortlist.

### 5.3. Lead flow

Mỗi Lead đại diện cho một cặp `Buyer Brief × Xưởng` và chỉ được tạo sau khi có match:

```text
created
→ sent
→ viewed (tùy chọn)
→ responded
→ quoted
→ sample_started
→ won | lost | expired
```

Cho phép `sent → responded` khi xưởng phản hồi trước lúc tracking được view. `expired` có thể xảy ra ở `sent`, `viewed`, `responded`, `quoted` hoặc `sample_started`.

### 5.4. Concierge matching

V1 không cần matching engine phức tạp.

Admin matching dựa trên:

- Category.
- MOQ.
- Production model.
- Sample support.
- Deadline.
- Khu vực.
- Availability còn hiệu lực.
- Verification scope.
- Outcome của các lead trước.

Mỗi match cần ghi lại lý do để sau này dùng làm dữ liệu huấn luyện/rule engine.

---

## 6. Buyer Brief

### 6.1. Trường bắt buộc

- Product category.
- Estimated quantity.
- Desired deadline.
- Production model.
- Sample required.
- Preferred location.
- Contact name.
- Phone/Zalo.

### 6.2. Trường khuyến khích

- Màu sắc.
- Size breakdown.
- Chất liệu dự kiến.
- Target price range.
- Có techpack chưa.
- Có rập chưa.
- Ảnh tham chiếu.
- Yêu cầu in/thêu/ép.
- Yêu cầu đóng gói.
- Ghi chú chất lượng.

### 6.3. Quy tắc UX

- Form chia thành 3–4 bước ngắn.
- Cho phép lưu bản nháp theo session.
- Không ép buyer nhập mọi chi tiết kỹ thuật ngay lần đầu.
- Có upload ảnh, PDF techpack và file tham chiếu.
- Hiển thị giải thích ngắn cho CMT/FOB/full package.

### 6.4. Qualification

Brief chỉ chuyển sang `qualified` khi đủ để team xác định:

- Nhóm xưởng phù hợp.
- Quy mô đơn.
- Deadline.
- Mô hình sản xuất.
- Thông tin liên hệ buyer.

---

## 7. Capability và Availability

### 7.1. Capability — dữ liệu năng lực thông thường

Ví dụ:

```text
Polo / Full package
MOQ thường: 100–1.000
Có làm mẫu: Có
Thời gian làm mẫu thường: 5–7 ngày
Lead time sản xuất thường: 20–30 ngày
Công suất ước tính: 10.000–20.000 sản phẩm/tháng
```

### 7.2. Availability — tình trạng hiện tại

Không yêu cầu số công suất tuyệt đối nếu xưởng không thể cung cấp chính xác.

Trạng thái đề xuất:

```text
available
limited
nearly_full
full
paused
unknown
```

Có thể kèm khoảng:

```text
1.000–3.000 sản phẩm trong 30 ngày
```

### 7.3. Freshness rule

Mỗi availability record bắt buộc có:

```text
confirmed_at
valid_until
source
```

Khi hết hạn:

- Không tiếp tục hiển thị “đang nhận đơn”.
- Public UI đổi sang “chưa có cập nhật gần đây”.
- Hệ thống tạo task nhắc team/xưởng xác nhận lại.

---

## 8. Trust model

### 8.1. Ba lớp đánh giá

#### Reputation

Kết quả hợp tác trước:

- Review đã xác minh.
- Verified engagement.
- Tỷ lệ phản hồi.
- Báo giá/làm mẫu/đơn hàng.

#### Capability fit

Mức phù hợp với brief cụ thể:

- Category.
- MOQ.
- Deadline.
- Production model.
- Sample capability.
- Availability.

#### Data confidence

Mức độ tin cậy của dữ liệu:

- Nguồn dữ liệu.
- Verification level.
- Ngày xác minh.
- Số trường được xác minh.
- Độ mới của availability.

### 8.2. Public representation V1

Không gộp thành một điểm duy nhất.

Hiển thị riêng:

```text
Mức phù hợp: Cao
Độ tin cậy dữ liệu: Cao
Uy tín hợp tác: Có dữ liệu đã xác minh
```

### 8.3. Review trong pilot

Review công khai không phải ưu tiên số một.

Ưu tiên trước:

- Verified engagement.
- Buyer reference.
- Admin interview.
- Outcome từ lead.

Review public vẫn hỗ trợ nhưng phải qua:

```text
unverified
contact_verified
engagement_verified
order_verified
```

---

## 9. Tech stack

| Lớp | Chọn | Lý do |
|---|---|---|
| Backend | Go, `chi` hoặc `net/http` Go 1.22+ | Nhẹ, nhanh, dễ kiểm soát |
| Database | PostgreSQL/Neon + `pgx` + `sqlc` | Type-safe SQL, hợp dữ liệu quan hệ |
| Migration | `goose` hoặc `golang-migrate` | Dễ chia migration |
| Frontend | Next.js App Router + TypeScript + Tailwind + shadcn/ui | SSR/ISR và admin UI |
| Form | react-hook-form + zod | Buyer Brief và admin validation |
| Fetch/cache | TanStack Query | Client state và mutation |
| Search V1 | `pg_trgm` + `search_text` đã normalize | Không dấu và fuzzy search |
| Storage | S3-compatible storage | Portfolio, techpack, ảnh tham chiếu |
| Analytics | Event table nội bộ | Theo dõi funnel và source |
| Notification | Email/Zalo/manual integration | Gửi link lead cho xưởng |

Quy ước:

- UI label tiếng Việt.
- Identifier code/database bằng tiếng Anh.
- Public pages SSR/ISR.
- Go chỉ cung cấp JSON API.

---

## 10. Kiến trúc tổng thể

```text
[ Next.js Public + Admin ]
          │
          │ REST/JSON
          ▼
[ Go API / Services ]
          │
          ├── Profile & Search
          ├── Verification
          ├── Buyer Brief
          ├── Matching
          ├── Lead Workflow
          ├── Outcome Aggregation
          └── Import / Audit
          │
          ▼
[ PostgreSQL / Neon ]
          │
          └── S3-compatible storage
```

Backend dependency:

```text
api → service → repository → domain
```

---

## 11. Data model PostgreSQL — v3

> Schema dưới đây là nền tảng để tách migration thật. Một số enum có thể chuyển thành lookup table nếu cần thay đổi thường xuyên.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Portable updated_at trigger, không phụ thuộc extension moddatetime.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- ENUMS
-- =========================================================

CREATE TYPE profile_kind AS ENUM (
  'factory',
  'manufacturer'
);

CREATE TYPE profile_status AS ENUM (
  'draft',
  'published',
  'temporarily_closed',
  'archived'
);

CREATE TYPE production_model AS ENUM (
  'cmt',
  'fob',
  'odm',
  'full_package'
);

CREATE TYPE verification_level AS ENUM (
  'unverified',
  'contact_verified',
  'document_verified',
  'onsite_verified'
);

CREATE TYPE verification_result AS ENUM (
  'passed',
  'partial',
  'failed'
);

CREATE TYPE availability_status AS ENUM (
  'available',
  'limited',
  'nearly_full',
  'full',
  'paused',
  'unknown'
);

CREATE TYPE brief_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'needs_information',
  'qualified',
  'matching',
  'matched',
  'rejected',
  'cancelled',
  'closed'
);

CREATE TYPE match_level AS ENUM (
  'high',
  'medium',
  'low',
  'insufficient_data'
);

CREATE TYPE lead_status AS ENUM (
  'created',
  'sent',
  'viewed',
  'responded',
  'quoted',
  'sample_started',
  'won',
  'lost',
  'expired'
);

CREATE TYPE lead_lost_reason AS ENUM (
  'no_response',
  'moq_mismatch',
  'price_mismatch',
  'deadline_mismatch',
  'capacity_unavailable',
  'capability_mismatch',
  'buyer_cancelled',
  'factory_declined',
  'selected_other_factory',
  'other'
);

CREATE TYPE review_status AS ENUM (
  'pending_verification',
  'pending_moderation',
  'approved',
  'rejected'
);

CREATE TYPE review_verification_status AS ENUM (
  'unverified',
  'contact_verified',
  'engagement_verified',
  'order_verified'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'operator',
  'editor',
  'user'
);

CREATE TYPE image_kind AS ENUM (
  'product',
  'factory',
  'machine',
  'certificate',
  'other'
);

CREATE TYPE contact_event_type AS ENUM (
  'phone_click',
  'zalo_click',
  'website_click',
  'view_address',
  'buyer_brief_start',
  'buyer_brief_submit'
);

-- =========================================================
-- USERS / MASTER DATA
-- =========================================================

CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT UNIQUE,
  phone         TEXT,
  name          TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'user',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE provinces (
  code          TEXT PRIMARY KEY,
  name_vi       TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL
);

CREATE TABLE districts (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  province_code TEXT NOT NULL REFERENCES provinces(code) ON DELETE RESTRICT,
  name_vi       TEXT NOT NULL,
  slug          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (province_code, slug),
  UNIQUE (id, province_code)
);

CREATE INDEX idx_districts_province
  ON districts (province_code, is_active, name_vi);

CREATE TABLE categories (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  name_vi       TEXT NOT NULL,
  parent_id     BIGINT REFERENCES categories(id) ON DELETE RESTRICT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- PROFILES
-- =========================================================

CREATE TABLE profiles (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug                       TEXT UNIQUE NOT NULL,
  kind                       profile_kind NOT NULL,
  name                       TEXT NOT NULL,
  tagline                    TEXT,
  description                TEXT,

  province_code              TEXT NOT NULL REFERENCES provinces(code) ON DELETE RESTRICT,
  district_id                BIGINT,
  address                    TEXT,
  latitude                   NUMERIC(9,6),
  longitude                  NUMERIC(9,6),

  established_year           SMALLINT,
  worker_count               INT,
  production_line_count      INT,

  contact_name               TEXT,
  contact_phone              TEXT,
  contact_zalo               TEXT,
  contact_email              TEXT,
  website_url                TEXT,
  facebook_url               TEXT,

  verification_level         verification_level NOT NULL DEFAULT 'unverified',
  last_verified_at           TIMESTAMPTZ,

  completeness_score         SMALLINT NOT NULL DEFAULT 0
                               CHECK (completeness_score BETWEEN 0 AND 100),
  featured                   BOOLEAN NOT NULL DEFAULT false,
  status                     profile_status NOT NULL DEFAULT 'draft',
  search_text                TEXT NOT NULL DEFAULT '',

  -- Aggregates nội bộ; không bắt buộc public toàn bộ.
  response_rate              NUMERIC(5,2),
  median_response_minutes    INT,
  quote_rate                 NUMERIC(5,2),
  sample_rate                NUMERIC(5,2),
  order_rate                 NUMERIC(5,2),

  created_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  FOREIGN KEY (district_id, province_code)
    REFERENCES districts(id, province_code) ON DELETE RESTRICT,
  CHECK (worker_count IS NULL OR worker_count >= 0),
  CHECK (production_line_count IS NULL OR production_line_count >= 0),
  CHECK (response_rate IS NULL OR response_rate BETWEEN 0 AND 100),
  CHECK (quote_rate IS NULL OR quote_rate BETWEEN 0 AND 100),
  CHECK (sample_rate IS NULL OR sample_rate BETWEEN 0 AND 100),
  CHECK (order_rate IS NULL OR order_rate BETWEEN 0 AND 100)
);

CREATE INDEX idx_profiles_public
  ON profiles (status, kind, province_code, featured);

CREATE INDEX idx_profiles_search
  ON profiles USING gin (search_text gin_trgm_ops);

CREATE INDEX idx_profiles_verified
  ON profiles (status, verification_level, last_verified_at DESC);

CREATE TABLE profile_slug_redirects (
  old_slug                    TEXT PRIMARY KEY,
  profile_id                  BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- CAPABILITIES — NĂNG LỰC TƯƠNG ĐỐI ỔN ĐỊNH
-- =========================================================

CREATE TABLE profile_capabilities (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id                BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  production_model           production_model NOT NULL,

  usual_min_order_qty        INT,
  usual_max_order_qty        INT,
  estimated_monthly_capacity_min INT,
  estimated_monthly_capacity_max INT,

  sample_supported           BOOLEAN NOT NULL DEFAULT false,
  usual_sample_lead_days_min INT,
  usual_sample_lead_days_max INT,
  usual_production_lead_days_min INT,
  usual_production_lead_days_max INT,

  materials_note             TEXT,
  machinery_note             TEXT,
  capability_note            TEXT,

  capability_verified_at     TIMESTAMPTZ,
  capability_source          TEXT,

  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (profile_id, category_id, production_model),
  CHECK (usual_min_order_qty IS NULL OR usual_min_order_qty >= 0),
  CHECK (
    usual_max_order_qty IS NULL
    OR usual_min_order_qty IS NULL
    OR usual_max_order_qty >= usual_min_order_qty
  )
);

CREATE INDEX idx_capabilities_filter
  ON profile_capabilities (
    category_id,
    production_model,
    sample_supported,
    usual_min_order_qty,
    profile_id
  );

CREATE INDEX idx_capabilities_profile
  ON profile_capabilities (profile_id, category_id, production_model);

-- =========================================================
-- AVAILABILITY — DỮ LIỆU ĐỘNG CÓ HẠN HIỆU LỰC
-- =========================================================

CREATE TABLE capability_availability (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_capability_id      BIGINT NOT NULL REFERENCES profile_capabilities(id) ON DELETE CASCADE,

  status                     availability_status NOT NULL DEFAULT 'unknown',
  earliest_sample_date       DATE,
  earliest_production_date   DATE,

  capacity_30_days_min       INT,
  capacity_30_days_max       INT,
  capacity_60_days_min       INT,
  capacity_60_days_max       INT,

  source                     TEXT NOT NULL,
  confirmed_by               BIGINT REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at               TIMESTAMPTZ NOT NULL,
  valid_until                TIMESTAMPTZ NOT NULL,
  note                       TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (valid_until > confirmed_at),
  CHECK (capacity_30_days_min IS NULL OR capacity_30_days_min >= 0),
  CHECK (capacity_60_days_min IS NULL OR capacity_60_days_min >= 0)
);

CREATE INDEX idx_availability_current
  ON capability_availability (
    profile_capability_id,
    valid_until DESC,
    confirmed_at DESC
  );

CREATE VIEW current_capability_availability AS
SELECT DISTINCT ON (profile_capability_id)
  id,
  profile_capability_id,
  status,
  earliest_sample_date,
  earliest_production_date,
  capacity_30_days_min,
  capacity_30_days_max,
  capacity_60_days_min,
  capacity_60_days_max,
  source,
  confirmed_by,
  confirmed_at,
  valid_until,
  note
FROM capability_availability
WHERE valid_until > now()
ORDER BY profile_capability_id, confirmed_at DESC;

-- =========================================================
-- VERIFICATION RECORDS
-- =========================================================

CREATE TABLE verification_records (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level                      verification_level NOT NULL,
  result                     verification_result NOT NULL,
  scope                      TEXT NOT NULL,
  method                     TEXT,
  note                       TEXT,
  service_paid               BOOLEAN NOT NULL DEFAULT false,
  verified_by                BIGINT REFERENCES users(id) ON DELETE SET NULL,
  verified_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until                TIMESTAMPTZ,
  evidence_object_key        TEXT, -- private bucket; chỉ sinh signed URL khi người có quyền truy cập
  is_public                  BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_verification_profile
  ON verification_records (profile_id, verified_at DESC);

CREATE TABLE profile_data_refreshes (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source                     TEXT NOT NULL,
  refreshed_by               BIGINT REFERENCES users(id) ON DELETE SET NULL,
  fields_refreshed           JSONB,
  note                       TEXT,
  refreshed_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- PORTFOLIO
-- =========================================================

CREATE TABLE profile_images (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id                BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  kind                       image_kind NOT NULL DEFAULT 'product',
  url                        TEXT NOT NULL,
  thumbnail_url              TEXT,
  caption                    TEXT,
  alt_text                   TEXT,
  sort_order                 INT NOT NULL DEFAULT 0,
  is_public                  BOOLEAN NOT NULL DEFAULT true,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_images
  ON profile_images (profile_id, category_id, is_public, sort_order);

-- =========================================================
-- BUYER BRIEFS
-- =========================================================

CREATE TABLE buyer_briefs (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_token               TEXT UNIQUE NOT NULL,
  status                     brief_status NOT NULL DEFAULT 'draft',

  buyer_name                 TEXT NOT NULL,
  buyer_phone                TEXT NOT NULL,
  buyer_zalo                 TEXT,
  buyer_email                TEXT,
  company_or_brand           TEXT,

  desired_deadline           DATE,
  production_model           production_model,
  sample_required            BOOLEAN,
  preferred_province_code    TEXT REFERENCES provinces(code) ON DELETE SET NULL,
  preferred_district_id      BIGINT,
  target_price_note          TEXT,
  general_note               TEXT,

  source                     TEXT,
  assigned_to                BIGINT REFERENCES users(id) ON DELETE SET NULL,
  submitted_at               TIMESTAMPTZ,
  reviewed_at                TIMESTAMPTZ,
  qualified_at               TIMESTAMPTZ,
  matched_at                 TIMESTAMPTZ,
  rejected_at                TIMESTAMPTZ,
  cancelled_at               TIMESTAMPTZ,
  closed_at                  TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (preferred_district_id, preferred_province_code)
    REFERENCES districts(id, province_code) ON DELETE SET NULL
);

CREATE INDEX idx_buyer_briefs_queue
  ON buyer_briefs (status, submitted_at DESC);

CREATE TABLE buyer_brief_status_history (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buyer_brief_id             BIGINT NOT NULL REFERENCES buyer_briefs(id) ON DELETE CASCADE,
  from_status                brief_status,
  to_status                  brief_status NOT NULL,
  changed_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  note                       TEXT,
  changed_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_buyer_brief_history
  ON buyer_brief_status_history (buyer_brief_id, changed_at);

CREATE TABLE buyer_brief_items (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buyer_brief_id             BIGINT NOT NULL REFERENCES buyer_briefs(id) ON DELETE CASCADE,
  category_id                BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  estimated_quantity         INT NOT NULL,
  colors_note                TEXT,
  size_breakdown_note        TEXT,
  material_note              TEXT,
  has_techpack               BOOLEAN,
  has_pattern                BOOLEAN,
  printing_note              TEXT,
  packaging_note             TEXT,
  quality_note               TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (estimated_quantity > 0)
);

CREATE TABLE buyer_brief_attachments (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buyer_brief_id             BIGINT NOT NULL REFERENCES buyer_briefs(id) ON DELETE CASCADE,
  object_key                 TEXT NOT NULL,
  original_file_name         TEXT,
  mime_type                  TEXT,
  size_bytes                 BIGINT,
  sha256                     TEXT,
  uploaded_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (size_bytes IS NULL OR size_bytes >= 0)
);

-- =========================================================
-- MATCHING
-- =========================================================

CREATE TABLE brief_matches (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buyer_brief_id             BIGINT NOT NULL REFERENCES buyer_briefs(id) ON DELETE CASCADE,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_level                match_level NOT NULL,
  reasons                    JSONB NOT NULL DEFAULT '[]'::jsonb,
  concerns                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  matched_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  matched_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  buyer_accepted             BOOLEAN,
  buyer_feedback             TEXT,
  UNIQUE (buyer_brief_id, profile_id)
);

CREATE INDEX idx_brief_matches
  ON brief_matches (buyer_brief_id, match_level, matched_at);

-- =========================================================
-- LEADS / FUNNEL / OUTCOME
-- =========================================================

CREATE TABLE leads (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_token               TEXT UNIQUE NOT NULL,
  buyer_brief_id             BIGINT NOT NULL REFERENCES buyer_briefs(id) ON DELETE CASCADE,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brief_match_id             BIGINT REFERENCES brief_matches(id) ON DELETE SET NULL,

  current_status             lead_status NOT NULL DEFAULT 'created',
  sent_at                    TIMESTAMPTZ,
  viewed_at                  TIMESTAMPTZ,
  first_response_at          TIMESTAMPTZ,
  quoted_at                  TIMESTAMPTZ,
  sample_started_at          TIMESTAMPTZ,
  won_at                     TIMESTAMPTZ,
  lost_at                    TIMESTAMPTZ,
  expired_at                 TIMESTAMPTZ,

  assigned_to                BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (buyer_brief_id, profile_id)
);

CREATE INDEX idx_leads_queue
  ON leads (current_status, created_at DESC);

CREATE INDEX idx_leads_profile
  ON leads (profile_id, current_status, created_at DESC);

CREATE TABLE lead_status_history (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id                    BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_status                lead_status,
  to_status                  lead_status NOT NULL,
  changed_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  note                       TEXT,
  changed_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_history
  ON lead_status_history (lead_id, changed_at);

CREATE TABLE lead_outcomes (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id                    BIGINT UNIQUE NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  lost_reason                lead_lost_reason,
  quoted_amount_note         TEXT,
  sample_completed           BOOLEAN,
  order_confirmed            BOOLEAN,
  order_quantity             INT,
  expected_delivery_date     DATE,
  actual_delivery_date       DATE,
  delivered_on_time          BOOLEAN,
  buyer_feedback_private     TEXT,
  factory_feedback_private   TEXT,
  outcome_verified           BOOLEAN NOT NULL DEFAULT false,
  verified_by                BIGINT REFERENCES users(id) ON DELETE SET NULL,
  verified_at                TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- REVIEWS — SECONDARY TRUST LAYER
-- =========================================================

CREATE TABLE reviews (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id                    BIGINT REFERENCES leads(id) ON DELETE SET NULL,
  author_user_id             BIGINT REFERENCES users(id) ON DELETE SET NULL,
  author_name                TEXT NOT NULL,
  author_email               TEXT,
  author_phone               TEXT,

  rating_overall             SMALLINT CHECK (rating_overall BETWEEN 1 AND 5),
  rating_quality             SMALLINT CHECK (rating_quality BETWEEN 1 AND 5),
  rating_delivery            SMALLINT CHECK (rating_delivery BETWEEN 1 AND 5),
  rating_communication       SMALLINT CHECK (rating_communication BETWEEN 1 AND 5),
  rating_issue_handling      SMALLINT CHECK (rating_issue_handling BETWEEN 1 AND 5),

  title                      TEXT,
  body                       TEXT,
  verification_status        review_verification_status NOT NULL DEFAULT 'unverified',
  verification_method        TEXT, -- manual_call | manual_zalo | linked_lead | document
  verification_note          TEXT,
  verified_by                BIGINT REFERENCES users(id) ON DELETE SET NULL,
  verified_at                TIMESTAMPTZ,
  proof_object_key           TEXT, -- private bucket; không trả qua public API
  submission_ip_hash         TEXT, -- chống spam; không trả qua public API
  status                     review_status NOT NULL DEFAULT 'pending_verification',
  moderation_note            TEXT,
  moderated_by               BIGINT REFERENCES users(id) ON DELETE SET NULL,
  moderated_at               TIMESTAMPTZ,
  published_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_public
  ON reviews (profile_id, status, published_at DESC);

-- =========================================================
-- COLLECTIONS / SEO
-- =========================================================

CREATE TABLE collections (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug                       TEXT UNIQUE NOT NULL,
  title                      TEXT NOT NULL,
  description                TEXT,
  selection_criteria         TEXT,
  editorial_content          TEXT,
  cover_url                  TEXT,
  province_code              TEXT REFERENCES provinces(code) ON DELETE SET NULL,
  category_id                BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  is_published               BOOLEAN NOT NULL DEFAULT false,
  published_at               TIMESTAMPTZ,
  created_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collection_items (
  collection_id              BIGINT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position                   INT NOT NULL DEFAULT 0,
  editorial_note             TEXT,
  PRIMARY KEY (collection_id, profile_id)
);

-- =========================================================
-- IDEMPOTENCY / IMPORT BATCHES
-- =========================================================

CREATE TABLE idempotency_records (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope                      TEXT NOT NULL,
  key_hash                   TEXT NOT NULL,
  request_hash               TEXT NOT NULL,
  resource_type              TEXT,
  resource_public_token      TEXT,
  response_status            INT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at                 TIMESTAMPTZ NOT NULL,
  UNIQUE (scope, key_hash)
);

CREATE TABLE import_batches (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_token               TEXT UNIQUE NOT NULL,
  input_hash                 TEXT NOT NULL,
  status                     TEXT NOT NULL CHECK (status IN ('previewed', 'committing', 'committed', 'failed')),
  created_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at               TIMESTAMPTZ,
  error_note                 TEXT
);

-- =========================================================
-- EVENTS / REPORTS / AUDIT
-- =========================================================

CREATE TABLE profile_contact_events (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_brief_id             BIGINT REFERENCES buyer_briefs(id) ON DELETE SET NULL,
  event_type                 contact_event_type NOT NULL,
  session_hash               TEXT,
  referrer_url               TEXT,
  landing_url                TEXT,
  utm_source                 TEXT,
  utm_medium                 TEXT,
  utm_campaign               TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profile_reports (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id                 BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_name              TEXT,
  reporter_contact           TEXT,
  reason                     TEXT NOT NULL,
  status                     TEXT NOT NULL DEFAULT 'open',
  handled_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
  handled_note               TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_at                 TIMESTAMPTZ
);

CREATE TABLE admin_audit_logs (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id              BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action                     TEXT NOT NULL,
  entity_type                TEXT NOT NULL,
  entity_id                  BIGINT,
  before_data                JSONB,
  after_data                 JSONB,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profile_capabilities_updated_at
BEFORE UPDATE ON profile_capabilities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_buyer_briefs_updated_at
BEFORE UPDATE ON buyer_briefs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_lead_outcomes_updated_at
BEFORE UPDATE ON lead_outcomes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## 12. Data consistency và business rules

### 12.1. Availability

- Chỉ record còn `valid_until > now()` mới được xem là current.
- Nếu có nhiều record còn hiệu lực, lấy record mới nhất theo `confirmed_at`.
- Không tự suy diễn `available` nếu không có xác nhận.
- Availability hết hạn phải giảm data confidence.

### 12.2. Buyer Brief status

Buyer Brief và Lead là hai entity độc lập, không dùng chung enum hoặc status vocabulary.
Mọi thay đổi `buyer_briefs.status` phải:

1. Tuân thủ transition map của Buyer Brief.
2. Chạy trong transaction.
3. Thêm một dòng vào `buyer_brief_status_history`.
4. Cập nhật timestamp tương ứng.
5. Ghi audit nếu do admin thay đổi thủ công.

### 12.3. Lead status

- Lead chỉ được tạo sau khi đã có `brief_match`.
- `brief_matches` đại diện shortlist; Lead không có trạng thái `shortlisted`.
- Lead không có trạng thái `qualified`.

Mọi thay đổi `leads.current_status` phải:

1. Tuân thủ transition map của Lead.
2. Chạy trong transaction.
3. Thêm một dòng vào `lead_status_history`.
4. Cập nhật timestamp tương ứng.
5. Ghi audit nếu do admin thay đổi thủ công.

### 12.4. Outcome aggregates

Các chỉ số profile được tính lại từ lead/outcome:

```text
response_rate
median_response_minutes
quote_rate
sample_rate
order_rate
```

Bắt buộc có command:

```text
cmd/rebuild-profile-metrics
```

Không sửa trực tiếp các aggregate từ admin UI.

### 12.5. Search

`profiles.search_text` được normalize từ:

- Tên.
- Địa chỉ.
- Category.
- Capability.
- Production model.
- Materials note.

Dùng duy nhất `searchtext.Normalize` trong Go cho cả lúc xây `search_text` và normalize query người dùng. Không có bản SQL/frontend thứ hai. Sau normalize mới dùng `gin_trgm_ops`.

### 12.6. Query profile list: bắt buộc dùng semi-join `EXISTS`

Filter profile chia thành hai tầng:

- Profile-level: `status`, `kind`, `province_code`, `district_id`, `verification_level`.
- Capability-level: `category_id`, `production_model`, MOQ, sample support và availability.

Không dùng `JOIN profile_capabilities + DISTINCT` cho list chính vì một profile có thể khớp nhiều capability, gây nhân dòng, sai pagination và làm relevance sort khó ổn định. Pattern chuẩn:

```sql
SELECT p.*
FROM profiles p
WHERE p.status = 'published'
  AND ($1::text IS NULL OR p.province_code = $1)
  AND ($2::bigint IS NULL OR p.district_id = $2)
  AND (
    ($3::bigint IS NULL
      AND $4::production_model IS NULL
      AND $5::boolean IS NULL
      AND $6::int IS NULL)
    OR EXISTS (
      SELECT 1
      FROM profile_capabilities pc
      WHERE pc.profile_id = p.id
        AND ($3::bigint IS NULL OR pc.category_id = $3)
        AND ($4::production_model IS NULL OR pc.production_model = $4)
        AND ($5::boolean IS NULL OR pc.sample_supported = $5)
        AND ($6::int IS NULL OR pc.usual_min_order_qty <= $6)
    )
  )
ORDER BY /* profile-level relevance/freshness/verification */
LIMIT $7 OFFSET $8;
```

Khi filter availability, tiếp tục dùng `EXISTS` trên `current_capability_availability`; không join trực tiếp vào result set chính. Sort và pagination luôn ở tầng profile.

### 12.7. Location master data

- `province_code` và `district_id` phải tham chiếu master data.
- Composite foreign key `(district_id, province_code)` ngăn district thuộc sai province.
- Không lưu quận/huyện bằng text tự do trong profile hoặc filter.
- Import phải map alias như `TP Thủ Đức`, `Thành phố Thủ Đức`, `Thủ Đức` về cùng một `district_id`.
- Master data này dùng chung cho filter và landing `/locations/{province}/{district}`.

### 12.8. Slug bất biến

- Đổi tên profile không tự regenerate slug.
- Khi bắt buộc đổi slug, ghi `old_slug -> profile_id` vào `profile_slug_redirects`.
- Redirect handler đọc `profiles.slug` hiện tại theo `profile_id`; mọi slug cũ redirect đúng một bước đến canonical mới nhất.
- Import/update không được âm thầm thay slug của profile đã publish.

### 12.9. `updated_at`

PostgreSQL không tự cập nhật `updated_at`. Tất cả bảng có cột này dùng trigger `set_updated_at()`. Chọn trigger tự viết để không phụ thuộc extension `moddatetime` trên môi trường deploy.

### 12.10. Privacy và object storage

- Portfolio public nằm ở public bucket/CDN.
- Techpack, ảnh brief, bằng chứng verification và bằng chứng review nằm ở private bucket.
- Database lưu `object_key`, không lưu signed URL vì signed URL có thời hạn.
- API chỉ sinh signed URL ngắn hạn sau khi kiểm tra quyền.
- Public DTO dùng allowlist; không bao giờ trả `proof_object_key`, `evidence_object_key`, `submission_ip_hash`, email/phone người review hoặc ghi chú moderation.

### 12.11. Review verification trong pilot

V1 không dựng OTP SMS/email verification. Với quy mô 30–50 profile, operator xác minh thủ công qua gọi điện, Zalo, lead liên kết hoặc tài liệu rồi ghi:

- `verification_method`.
- `verification_note`.
- `verified_by`.
- `verified_at`.

OTP và endpoint tự động hóa verification để V1.1 sau khi đã chứng minh volume đủ lớn.

### 12.12. Rating

Review/rating là trust signal phụ. Nếu cần Bayesian weighted rating, tính ở query/report time từ:

- Trung bình rating của profile.
- Số review đã xác minh.
- Trung bình toàn hệ thống tại thời điểm query.
- Hệ số prior tối thiểu.

Không lưu `weighted_rating` thành cột vì global mean thay đổi theo thời gian và làm giá trị bị stale.

### 12.13. Business timezone

- Timestamp lưu UTC.
- Business timezone là `Asia/Ho_Chi_Minh`.
- Deadline, báo cáo theo ngày, verified trong N ngày và mọi biên `DATE` dùng ngày Việt Nam.
- Go truyền `business_today` cho query nghiệp vụ; không dựa vào timezone mặc định của DB.

### 12.14. Batch loading và N+1

Profile list card dùng số query cố định:

1. Page profile.
2. Capability/category theo `profile_id = ANY($ids)`.
3. Cover image theo `profile_id = ANY($ids)`.
4. Current availability theo batch khi cần.

Không query relation trong vòng lặp profile.

### 12.15. Idempotency

- Buyer Brief, review và action public có retry dùng `Idempotency-Key`/`submission_token`.
- Cùng key + payload khác trả `409`.
- Import commit dùng `import_batch_id`; chạy lại không nhân đôi dữ liệu.
- Không dedupe chính bằng số điện thoại.

### 12.16. Database runtime

- Dùng `pgxpool` với giới hạn connection theo môi trường.
- Thiết lập request timeout, `statement_timeout` và `idle_in_transaction_session_timeout`.
- Phase 1 dùng in-memory token bucket cho rate limit một instance.
- Không dựng Redis, outbox hoặc notification worker trong Phase 1.

---

## 13. API surface

### 13.1. Public profile/search

```http
GET /api/profiles
  ?q=
  &category=
  &province=
  &district=
  &production_model=
  &moq_max=
  &sample_supported=
  &availability=
  &verification_level=
  &sort=relevance|freshness|verified|response
  &page=

GET /api/profiles/{slug}
GET /api/profiles/{slug}/portfolio
GET /api/profiles/{slug}/reviews
GET /api/categories
GET /api/provinces
GET /api/districts?province=
GET /api/collections
GET /api/collections/{slug}
GET /api/search/suggestions?q=
POST /api/events/contact
```

Contact CTA implementation:

- Frontend gửi event bằng `navigator.sendBeacon()` hoặc `fetch(..., {keepalive: true})`.
- Không `await` event API trước khi mở `tel:`, Zalo hoặc website.
- Event tracking là best-effort và không được làm chậm hành động liên hệ.

### 13.2. Buyer Brief

```http
POST  /api/buyer-briefs
GET   /api/buyer-briefs/{public_token}
PATCH /api/buyer-briefs/{public_token}
POST  /api/buyer-briefs/{public_token}/attachments
POST  /api/buyer-briefs/{public_token}/submit
```

### 13.3. Lead portal cho xưởng

Xưởng nhận link riêng, chưa cần account đầy đủ:

```http
GET  /api/leads/{public_token}
POST /api/leads/{public_token}/view
POST /api/leads/{public_token}/respond
POST /api/leads/{public_token}/decline
```

Không public thông tin buyer/techpack vượt quá quyền cần thiết.

### 13.4. Admin operations

```http
GET    /api/admin/buyer-briefs
PATCH  /api/admin/buyer-briefs/{id}
POST   /api/admin/buyer-briefs/{id}/qualify
POST   /api/admin/buyer-briefs/{id}/matches
POST   /api/admin/buyer-briefs/{id}/send-leads

GET    /api/admin/leads
PATCH  /api/admin/leads/{id}/status
POST   /api/admin/leads/{id}/outcome

POST   /api/admin/profiles
PATCH  /api/admin/profiles/{id}
POST   /api/admin/profiles/{id}/publish
POST   /api/admin/profiles/{id}/archive
POST   /api/admin/profiles/{id}/verification
POST   /api/admin/capabilities/{id}/availability

POST   /api/admin/import/preview
POST   /api/admin/import/commit  # yêu cầu import_batch_id/idempotency

GET    /api/admin/reports/pilot
GET    /api/admin/reports/funnel
GET    /api/admin/reports/factory-performance
```

---

## 14. Admin V1

Admin cần tối ưu cho vận hành, không cần đẹp như SaaS hoàn chỉnh.

### 14.1. Màn hình cần có

1. Profile list/detail/edit.
2. Capability và availability timeline.
3. Verification records.
4. Buyer Brief queue.
5. Matching workspace.
6. Lead pipeline.
7. Outcome form.
8. Import preview/commit.
9. Data freshness dashboard.
10. Pilot KPI dashboard.

### 14.2. Matching workspace

Một màn hình hiển thị:

- Brief bên trái.
- Danh sách xưởng candidate bên phải.
- Capability.
- Availability.
- Verification.
- Outcome gần đây.
- Nút thêm vào shortlist.
- Trường nhập match reasons và concerns.

---

## 15. SEO và distribution

### 15.1. SEO foundation

- SSR/ISR cho profile, category, location và collection.
- Sitemap động.
- Canonical rõ ràng.
- JSON-LD `LocalBusiness`/`Organization`.
- `AggregateRating` chỉ khi đủ điều kiện.
- Open Graph từ portfolio.
- Không index filter page mỏng.

### 15.2. Cold-start distribution

Không phụ thuộc SEO một mình.

Chạy song song:

- Thu thập xưởng từ mạng lưới hiện có.
- Phỏng vấn local brand/shop.
- Nhận yêu cầu thật và matching thủ công.
- Viết case study từ các brief đã xử lý.
- Tạo collection theo nhu cầu thật.
- Chia sẻ qua cộng đồng seller/local brand.

### 15.3. Service-assisted acquisition

Giai đoạn đầu có thể vận hành như một dịch vụ:

> Buyer gửi yêu cầu → team hỗ trợ tìm xưởng → dữ liệu kết quả quay về hệ thống.

Đây là nguồn học nhanh nhất trước khi tự động hóa.

---

## 16. Monetization principles

### 16.1. Miễn phí

- Hồ sơ cơ bản.
- Thông tin liên hệ.
- Portfolio giới hạn.
- Nhận lead giới hạn.

### 16.2. Trả phí

- Dịch vụ xây dựng hồ sơ.
- Chụp/quay portfolio.
- Verification tại chỗ.
- Dashboard lead.
- Quản lý availability.
- Thống kê nhu cầu buyer.
- Gói nhận lead theo category/khu vực.
- Sponsored placement có nhãn rõ ràng.

### 16.3. Thứ tự thử nghiệm doanh thu

1. Portfolio service.
2. Verification service.
3. Dashboard và availability management.
4. Qualified lead package.
5. Sponsored placement.
6. Success fee chỉ sau khi có cơ chế xác minh outcome đủ tin cậy.

Không bán thứ hạng làm nguồn doanh thu chính.

---

## 17. KPI pilot

### 17.1. Supply/data

- Published profiles.
- Profile completeness ≥ 80%.
- Profiles có portfolio đủ chuẩn.
- Profiles có capability được xác minh.
- Availability freshness rate.
- Contact validity rate.

### 17.2. Demand

- Buyer briefs submitted.
- Qualified brief rate.
- Time to qualify.
- Brief completion rate.
- Attachment/techpack rate.

### 17.3. Matching

- Time to shortlist.
- Số xưởng trung bình mỗi shortlist.
- Buyer shortlist acceptance rate.
- Match rejection reason.

### 17.4. Lead funnel

- Lead response rate.
- Median response time.
- Qualified lead rate.
- Quote rate.
- Sample rate.
- Order rate.
- Expired/no-response rate.
- Lost reason distribution.

### 17.5. Outcome quality

- Verified outcome rate.
- Repeat buyer rate.
- Repeat factory selection rate.
- On-time rate khi đủ dữ liệu.
- Tỷ lệ complaint sau sample/order.

### 17.6. Business validation

- Xưởng sẵn sàng trả cho portfolio.
- Xưởng sẵn sàng trả cho verification.
- Xưởng sẵn sàng trả cho qualified lead.
- Buyer sẵn sàng quay lại gửi brief mới.

---

## 18. Roadmap thực thi

### Phase 0 — Pilot operations design

1. Chốt category áo thun/polo.
2. Chốt khu vực pilot.
3. Data dictionary.
4. Buyer Brief form.
5. Verification checklist.
6. Availability update script/process.
7. Lead status SOP.
8. Lost reason dictionary.
9. Privacy rule cho techpack và thông tin buyer.

**Output:** Team có thể vận hành pilot bằng Sheet/Form trước cả khi code đầy đủ.

### Phase 1 — Profile discovery foundation

1. Migrations tên `YYYYMMDDHHMMSS` + master data tỉnh/quận-huyện/category.
2. Profile/capability/portfolio.
3. Search/filter dùng `EXISTS` và một `searchtext.Normalize` duy nhất.
4. Profile card batch loading, không N+1.
5. Import preview/commit idempotent + alias mapping quận/huyện.
6. SSR profile/list pages.
7. Slug immutable + redirect một bước theo `profile_id`.
8. Contact event fire-and-forget bằng `sendBeacon`.
9. `pgxpool`, statement/request timeout và in-memory rate limit.
10. Seed 30–50 hồ sơ thật.
11. Sitemap/metadata.

### Phase 2 — Buyer Brief và concierge matching

1. Buyer Brief public form.
2. Upload attachment.
3. Admin brief queue.
4. Matching workspace.
5. Brief matches + reasons.
6. Gửi shortlist/lead thủ công.

**Cột mốc:** Hệ thống xử lý được một yêu cầu thật từ đầu đến lúc gửi xưởng.

### Phase 3 — Lead tracking và outcome

1. Link lead riêng.
2. Viewed/responded tracking.
3. Lead pipeline.
4. Status history.
5. Outcome form.
6. Funnel dashboard.
7. Rebuild metrics command.

**Cột mốc:** Biết lead đã đi đến báo giá, làm mẫu hay đơn sản xuất.

### Phase 4 — Availability và verification depth

1. Availability timeline.
2. Expiry/reminder.
3. Verification records.
4. Data confidence display.
5. Refresh dashboard.

### Phase 5 — SEO/content expansion

1. Collections từ nhu cầu thật.
2. Case study.
3. Category/location landing pages.
4. Internal linking.
5. Checklist chọn xưởng.

### Phase 6 — V1.1+

- Account buyer/xưởng.
- Claim profile.
- Saved profiles.
- Owner dashboard.
- Availability self-update có moderation.
- Rule-based matching.
- Notification automation.

### Phase 7 — V2+

- AI-assisted matching.
- CRM nhẹ cho xưởng.
- RFQ workflow nâng cao.
- Thanh toán/escrow chỉ khi nhu cầu đã được chứng minh.

---

## 19. Scope V1 chốt

### 19.1. Bắt buộc có

- Profile xưởng/nhà sản xuất B2B.
- Category áo thun/polo và master data tỉnh/quận-huyện cho khu vực pilot.
- Capability theo category.
- Profile list query dùng semi-join `EXISTS`.
- Availability có hạn hiệu lực.
- Portfolio.
- Verification record.
- Search/filter.
- Buyer Brief.
- Attachment upload private bằng `object_key`.
- Matching thủ công có reasons.
- Lead link riêng.
- Buyer Brief status history.
- Lead status history với Lead bắt đầu ở `created`.
- Outcome data.
- Pilot KPI dashboard.
- Import preview/commit idempotent bằng `import_batch_id`.
- Admin audit log.
- Slug immutable và 301 redirect khi đổi bắt buộc.
- Private evidence/attachment storage + public DTO allowlist.
- Contact event không chặn CTA.
- Trigger tự cập nhật `updated_at`.
- Business timezone `Asia/Ho_Chi_Minh`.
- Batch loading không N+1.
- `pgxpool` + query/request timeout.
- SSR/ISR và SEO foundation.

### 19.2. Không nằm trong V1

- AI matching.
- Chat nội bộ.
- Thanh toán.
- Escrow.
- Đấu giá báo giá.
- Marketplace transaction.
- Upvote/leaderboard.
- Community.
- Public account đầy đủ.
- Claim tự động.
- CRM lớn.
- Điểm matching phần trăm.
- Công khai toàn bộ metric nội bộ của xưởng.

---

## 20. Definition of Done V1

V1 được coi là hoàn thành khi:

- Có ít nhất 30 profile published đạt completeness ≥ 80%.
- Mỗi profile có capability, portfolio, verification level và ngày cập nhật.
- Ít nhất 60% capability có availability còn hiệu lực trong pilot.
- Buyer gửi được brief có attachment.
- Admin qualify, matching và tạo được 3–5 `brief_matches`.
- Mọi thay đổi Buyer Brief có status history riêng.
- Lead được tạo ở `created`, gửi qua link riêng và ghi nhận viewed/responded.
- Mọi thay đổi Lead có status history riêng.
- Có thể ghi nhận quoted, sample_started, won và lost reason.
- Dashboard hiển thị response, quote, sample và order rate.
- Có ít nhất 10 qualified briefs trong pilot.
- Có ít nhất một lead đi đến làm mẫu hoặc đơn sản xuất.
- Search không dấu dùng cùng `searchtext.Normalize` cho index/query; filter dùng `EXISTS`, không nhân dòng profile.
- Quận/huyện được map bằng master data, không có district text tự do trong profile.
- Contact click không bị chậm bởi event tracking.
- Slug profile đã publish không tự thay đổi khi sửa tên.
- Public API không lộ evidence, proof, IP hash hoặc contact riêng của reviewer.
- Attachment DB lưu `object_key`, không lưu signed URL.
- Public POST và import commit không tạo bản ghi trùng khi retry.
- List card không phát sinh N+1.
- Logic ngày qua test biên `Asia/Ho_Chi_Minh`.
- `updated_at` tự đổi khi update record.
- Public pages SSR/ISR, metadata và sitemap hoạt động.
- Không có AI matching, payment, escrow hoặc marketplace scope chen vào V1.

---

## 21. Rủi ro và kiểm soát

| Rủi ro | Cách kiểm soát |
|---|---|
| Availability nhanh lỗi thời | `valid_until`, reminder, giảm confidence khi hết hạn |
| Xưởng khai công suất quá cao | Dùng khoảng, ghi nguồn, xác minh theo category |
| Buyer Brief thiếu thông tin | Multi-step form, admin `needs_information` |
| Xưởng xem lead qua Zalo nhưng hệ thống không biết | Chỉ gửi link lead riêng |
| Lead status bị cập nhật tùy ý | State transition rules + history + audit |
| Matching mang tính cảm tính | Bắt buộc reasons/concerns cho mỗi match |
| Hiển thị metric khiến xưởng phản ứng | Public chỉ hiển thị badge/tổng hợp, metric chi tiết là private |
| Lộ techpack/ảnh mẫu | Private storage + signed URL + permission check |
| Review gây tranh chấp | Moderation, verification, outcome data ưu tiên hơn open review |
| Featured phá relevance | Sponsored có nhãn và không vượt relevance threshold |
| Pilot phình scope | Chỉ áo thun/polo, factory/manufacturer, khu vực hẹp |
| Filter capability làm nhân dòng | Dùng correlated `EXISTS`; sort/pagination ở tầng profile |
| District alias làm vỡ filter | Master data + alias mapping khi import |
| Tracking làm chậm CTA | `sendBeacon`/`keepalive`, không await |
| Đổi tên làm mất SEO | Slug immutable + bảng redirect 301 |
| Lộ bằng chứng hoặc contact reviewer | Private object storage + DTO allowlist |

---

## 22. Kết luận

Sản phẩm không nên bán bằng thông điệp:

> Nơi tìm danh sách xưởng may.

Thông điệp đúng hơn:

> **Tìm đúng xưởng may dựa trên năng lực thực tế, lịch nhận đơn hiện tại và kết quả hợp tác đã xác minh.**

Thứ tự tạo lợi thế:

```text
Profile Data
→ Availability Data
→ Buyer Brief
→ Curated Matching
→ Tracked Lead
→ Verified Outcome
→ Better Matching
→ Monetization
```

Framework và giao diện có thể bị sao chép. Bộ dữ liệu kết quả và quy trình cập nhật dữ liệu mới là tài sản dài hạn của nền tảng.

---

## 23. Coding Standards bắt buộc

Toàn bộ implementation của dự án phải tuân thủ tài liệu:

> **`CODING_STANDARDS_Directory_Matching_v1.1.md`**

Các quyết định kỹ thuật bắt buộc trước Phase 1:

- Luồng backend: `handler -> service -> repository -> database`.
- SQL nghiệp vụ dùng `sqlc`, không dùng ORM.
- Capability filter dùng correlated `EXISTS`, không dùng `JOIN + DISTINCT`.
- Public API dùng DTO allowlist; không serialize database row trực tiếp.
- API error dùng `application/problem+json`.
- OpenAPI là contract nguồn và phải cập nhật cùng code.
- Slug profile đã publish bất biến; thay đổi bắt buộc phải tạo redirect 301.
- Techpack, evidence và review proof lưu private object storage.
- Buyer Brief và Lead có state machine/history riêng; Lead không dùng `shortlisted`/`qualified`.
- State transition, history và timestamps cập nhật trong cùng transaction.
- `updated_at` dùng trigger tự viết dùng chung.
- Một `searchtext.Normalize` cho cả write/query; batch loading không N+1.
- Business timezone `Asia/Ho_Chi_Minh`; DB runtime có pool/timeouts.
- Idempotency cho public POST/import commit.
- TypeScript strict; Server Components mặc định.
- Contact tracking dùng `sendBeacon`/`keepalive`, không chặn CTA.
- Domain/service có tối thiểu 80% line coverage; transition và permission critical phải phủ đủ decision cases.
- CI phải kiểm tra lint, test, migration, sqlc generation, OpenAPI, build và secret scan.
- Git flow dùng `main`, `dev`, `feature/*`, `fix/*`, `hotfix/*`; commit prefix `feat`, `fix`, `refactor`, `chore`, `test`, `docs`.

Bất kỳ ngoại lệ nào cũng phải có ADR hoặc giải thích rõ trong pull request.
