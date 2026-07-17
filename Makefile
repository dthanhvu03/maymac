# maymac — giao diện lệnh thống nhất cho team & CI (coding standards §27).
# Tên tool bên trong có thể đổi; tên target giữ ổn định.

GOOSE_DRIVER   ?= postgres
GOOSE_DBSTRING ?= postgres://postgres:dev@localhost:55432/maymac?sslmode=disable
MIGRATIONS_DIR ?= db/migrations

export GOOSE_DRIVER
export GOOSE_DBSTRING

.PHONY: setup dev fmt lint test test-integration generate \
        migrate-up migrate-down migrate-status seed-master seed-demo \
        openapi-validate ci db-up db-down verify-migrations

setup:            ## Cài công cụ dev (Go tools, pnpm deps) — bổ sung khi có Go
	@echo "TODO: cài goose, sqlc; (cd apps/web && pnpm install)"

dev:              ## Chạy server + web ở chế độ dev
	@echo "TODO: chạy cmd/server + apps/web (cần Go)"

fmt:              ## Format code
	@echo "TODO: gofmt / prettier"

lint:             ## Lint
	@echo "TODO: golangci-lint / eslint"

test:             ## Unit test
	@echo "TODO: go test ./... ; (cd apps/web && pnpm test)"

test-integration: ## Integration test (cần DB)
	@echo "TODO: go test -tags=integration ./..."

generate:         ## Sinh code (sqlc)
	@echo "TODO: sqlc generate"

# --- Database migrations (goose) ---
db-up:            ## Bật Postgres tạm trong Docker (port 55432)
	docker run -d --name maymac-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=maymac -p 55432:5432 postgres:16

db-down:          ## Dừng & xóa Postgres tạm
	docker rm -f maymac-pg

migrate-up:       ## Áp dụng tất cả migration
	goose -dir $(MIGRATIONS_DIR) up

migrate-down:     ## Rollback 1 migration
	goose -dir $(MIGRATIONS_DIR) down

migrate-status:   ## Trạng thái migration
	goose -dir $(MIGRATIONS_DIR) status

verify-migrations: ## Verify migration bằng psql trong container (không cần Go)
	bash scripts/verify-migrations.sh

seed-master:      ## Seed master data (province + district)
	@echo "TODO: cmd/seed --master"

seed-demo:        ## Seed dữ liệu demo
	@echo "TODO: cmd/seed --demo"

openapi-validate: ## Validate api/openapi.yaml
	@echo "TODO: openapi validate"

ci: fmt lint test ## Chuỗi kiểm tra CI
	@echo "CI done"
