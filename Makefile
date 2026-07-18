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

GOBIN ?= $(CURDIR)/bin

setup:            ## Cài công cụ dev (goose, sqlc) vào ./bin
	GOBIN=$(GOBIN) go install github.com/pressly/goose/v3/cmd/goose@latest
	GOBIN=$(GOBIN) go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
	@echo "goose + sqlc đã cài vào $(GOBIN)"

dev:              ## Chạy server + web ở chế độ dev
	@echo "TODO: chạy cmd/server + apps/web (cần Go)"

fmt:              ## Format code
	@echo "TODO: gofmt / prettier"

lint:             ## Lint
	@echo "TODO: golangci-lint / eslint"

test:             ## Unit test (Go)
	go test ./...

test-integration: ## Integration test (cần DB)
	@echo "TODO: go test -tags=integration ./..."

generate:         ## Sinh code (sqlc) từ db/queries + db/migrations
	$(GOBIN)/sqlc generate

# --- Database migrations (goose) ---
db-up:            ## Bật Postgres tạm trong Docker (port 55432)
	docker run -d --name maymac-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=maymac -p 55432:5432 postgres:16

db-down:          ## Dừng & xóa Postgres tạm
	docker rm -f maymac-pg

migrate-up:       ## Áp dụng tất cả migration
	$(GOBIN)/goose -dir $(MIGRATIONS_DIR) up

migrate-down:     ## Rollback 1 migration
	$(GOBIN)/goose -dir $(MIGRATIONS_DIR) down

migrate-status:   ## Trạng thái migration
	$(GOBIN)/goose -dir $(MIGRATIONS_DIR) status

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
