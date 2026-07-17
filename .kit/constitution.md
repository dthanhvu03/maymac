# Hiến pháp dự án (Project Constitution)

> Các nguyên tắc bất biến của dự án. Agent phải tuân thủ trong mọi phiên làm việc.

## Chúng ta đang xây gì
maymac là **nền tảng dữ liệu và uy tín (directory + matching) cho ngành gia công may mặc** tại Việt Nam, giúp thương hiệu/shop tìm đúng xưởng dựa trên **năng lực thực tế, tình trạng nhận đơn hiện tại và lịch sử hợp tác đã được xác minh**. V1 (pilot) tập trung ba việc: (1) chuẩn hóa & xác minh dữ liệu xưởng, (2) thu nhận yêu cầu sản xuất có cấu trúc (Buyer Brief) từ buyer, (3) matching thủ công (concierge), theo dõi lead từ lúc gửi đến khi thắng/thua và ghi nhận kết quả thật. **Đây không phải marketplace giao dịch** trong giai đoạn đầu — V1 KHÔNG có thanh toán, escrow, đấu giá báo giá, chat nội bộ hay AI matching. Sản phẩm & khu vực pilot hẹp: áo thun/polo, khu vực TP.HCM – Bình Dương – Đồng Nai, MOQ 50–1.000, khởi đầu với 30–50 hồ sơ xưởng được kiểm tra kỹ.

## Ai dùng nó
- **Buyer:** local brand, shop TikTok/Shopee, đơn vị thiết kế thời trang, seller làm private label, doanh nghiệp cần đồng phục MOQ vừa & nhỏ — cần tìm nhanh 3–5 xưởng phù hợp và tin cậy.
- **Xưởng / nhà sản xuất B2B:** cần nhận lead đúng năng lực, có hồ sơ năng lực và uy tín được ghi nhận theo thời gian.
- **Operator / Admin nội bộ:** xác minh dữ liệu, làm matching thủ công, quản lý vòng đời Buyer Brief và Lead.

## Không bao giờ được xảy ra
- **Không tạo độ chính xác giả:** không hiển thị số matching kiểu "phù hợp 92%" khi dữ liệu chưa đủ — chỉ dùng mức `high / medium / low / insufficient_data` kèm lý do.
- **Không bán được kết quả xác minh:** `verification_service_paid` và `verification_result` (passed/partial/failed) là hai giá trị độc lập; trả phí không mua được kết quả "passed".
- **Không rò dữ liệu nhạy cảm:** techpack, ảnh brief, evidence/proof, email/SĐT người review, ghi chú moderation, `object_key` riêng tư — không bao giờ nằm trong public bucket hay public DTO (public API luôn dùng allowlist).
- **Không thao tác phá hủy dữ liệu trên production** (DROP/TRUNCATE/DELETE hàng loạt, xóa volume). Mọi thay đổi schema/migration phải có bước rollback và người duyệt.
- **Không hiển thị availability đã hết hạn như "đang nhận đơn":** dữ liệu availability bắt buộc có `confirmed_at` / `valid_until` / `source`; hết hạn thì hạ độ tin cậy.
- **Không đổi slug đã publish một cách âm thầm:** slug đã publish là bất biến; khi buộc đổi phải ghi redirect 301 (`old_slug -> profile_id`).
- **Không đưa business logic vào handler và không rò domain ra tầng transport/DB:** giữ đúng `handler -> service -> repository -> domain`.

## Lựa chọn không thương lượng (stack & quy ước)
- **Kiến trúc:** monorepo. Backend **Go** (chi / net/http, Go 1.22+) chỉ cung cấp JSON API; Frontend **Next.js App Router + TypeScript + Tailwind + shadcn/ui** (SSR/ISR).
- **Database:** PostgreSQL/Neon + `pgx` (`pgxpool`) + `sqlc`; migration bằng `goose`/`golang-migrate`. Không dùng ORM cho query nghiệp vụ chính.
- **Quy ước ngôn ngữ:** UI/label bằng **tiếng Việt**; identifier trong code/database bằng **tiếng Anh**.
- **Nguyên tắc dữ liệu:** dữ liệu sâu hơn dữ liệu nhiều; matching thủ công trước, tự động sau; mọi thay đổi trạng thái quan trọng (Buyer Brief, Lead) chạy trong transaction + ghi history + audit.
- **Chế độ (Mode):** vibe — làm nhanh, nói ngôn ngữ đời thường, guardrail luôn bật.

> Chi tiết kỹ thuật đầy đủ: `docs/Directory_Matching_nganh_gia_cong_may_mac_v3.3.md` và `docs/CODING_STANDARDS_Directory_Matching_v1.1.md`.
