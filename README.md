# maymac — Directory & Matching ngành gia công may mặc

Nền tảng dữ liệu và uy tín giúp thương hiệu/shop tìm đúng xưởng gia công may mặc dựa trên **năng lực thực tế, tình trạng nhận đơn hiện tại và lịch sử hợp tác đã xác minh**. Xem hiến pháp dự án ở [.kit/constitution.md](.kit/constitution.md).

> **V1 (pilot)** tập trung: chuẩn hóa & xác minh dữ liệu xưởng · thu Buyer Brief có cấu trúc · matching thủ công (concierge) + theo dõi lead. **Không** thanh toán/escrow/đấu giá/chat/AI matching.

## Kiến trúc

```
[ Next.js Public + Admin ]  →  REST/JSON  →  [ Go API ]  →  [ PostgreSQL / Neon ]  →  S3-compatible storage
```

- **Backend:** Go 1.22+ (chi/net/http), `pgx` + `sqlc`, JSON API. `handler → service → repository → domain`.
- **Frontend:** Next.js App Router + TypeScript + Tailwind + shadcn/ui (SSR/ISR). UI tiếng Việt.
- **Database:** PostgreSQL, migration bằng **goose**.

Đặc tả đầy đủ: [docs/Directory_Matching_nganh_gia_cong_may_mac_v3.3.md](docs/Directory_Matching_nganh_gia_cong_may_mac_v3.3.md) · Coding standards: [docs/CODING_STANDARDS_Directory_Matching_v1.1.md](docs/CODING_STANDARDS_Directory_Matching_v1.1.md).

## Cấu trúc thư mục

```
apps/web/        Next.js public + admin
cmd/             Go entrypoints: server, migrate, seed, rebuild-profile-metrics
internal/        domain · service · repository · api · auth · storage · observability · config
db/              migrations (goose) · queries (sqlc) · seed
api/             openapi.yaml
scripts/         dev/ops scripts
docs/            product spec + coding standards
```

## Database migrations (goose)

Migration nằm ở `db/migrations/`, định dạng tên `YYYYMMDDHHMMSS_description.sql`, mỗi file có block `-- +goose Up` và `-- +goose Down`.

### Chạy thử schema trên Postgres trong Docker

```bash
# Bật Postgres tạm
docker run -d --name maymac-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=maymac -p 55432:5432 postgres:16

# (Khi đã cài Go) cài goose rồi migrate
go install github.com/pressly/goose/v3/cmd/goose@latest
export GOOSE_DRIVER=postgres
export GOOSE_DBSTRING="postgres://postgres:dev@localhost:55432/maymac?sslmode=disable"
goose -dir db/migrations up
goose -dir db/migrations status
```

> Chưa cài Go? Xem `scripts/verify-migrations.sh` — apply trực tiếp bằng `psql` trong container để kiểm tra schema.

## Trạng thái

Đang ở giai đoạn **nền móng**: khung repo + schema database. Go API server và Next.js app sẽ được dựng ở các lát sau (Go chưa được cài trên máy dev hiện tại).
