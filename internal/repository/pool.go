// Package repository chứa truy cập dữ liệu. pool.go khởi tạo pgxpool từ Config.
package repository

import (
	"context"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dthanhvu03/maymac/internal/config"
)

// NewPool tạo pgxpool theo Config. Pool kết nối lazy — chưa ping ở đây;
// dùng /readyz để kiểm tra khả dụng thật của database.
func NewPool(ctx context.Context, cfg config.Config) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("repository: parse DATABASE_URL: %w", err)
	}

	poolCfg.MaxConns = cfg.DBMaxConns
	poolCfg.MinConns = cfg.DBMinConns
	poolCfg.MaxConnLifetime = cfg.DBMaxConnLifetime

	// statement_timeout / idle_in_transaction_session_timeout tính bằng mili-giây.
	poolCfg.ConnConfig.RuntimeParams["statement_timeout"] =
		strconv.FormatInt(cfg.DBStatementTimeout.Milliseconds(), 10)
	poolCfg.ConnConfig.RuntimeParams["idle_in_transaction_session_timeout"] =
		strconv.FormatInt(cfg.DBIdleInTxSessionTimeout.Milliseconds(), 10)

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("repository: tạo pgxpool: %w", err)
	}
	return pool, nil
}
