// Package config nạp cấu hình runtime từ environment. Không hard-code giá trị
// môi trường; mọi thứ đọc từ env với default hợp lý cho dev.
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Env string

	HTTPAddr         string
	HTTPReadTimeout  time.Duration
	HTTPWriteTimeout time.Duration
	HTTPIdleTimeout  time.Duration
	ShutdownTimeout  time.Duration

	DatabaseURL              string
	DBMaxConns               int32
	DBMinConns               int32
	DBMaxConnLifetime        time.Duration
	DBStatementTimeout       time.Duration
	DBIdleInTxSessionTimeout time.Duration

	// AdminAPIToken bảo vệ nhóm route /api/admin. Rỗng = admin đóng (fail-closed).
	AdminAPIToken string

	// Rate limit công khai (per-IP, in-memory).
	PublicRateLimitRPM   int
	PublicRateLimitBurst int
}

// Load đọc Config từ env. Trả lỗi nếu thiếu biến bắt buộc.
func Load() (Config, error) {
	c := Config{
		Env:              getStr("APP_ENV", "dev"),
		HTTPAddr:         getStr("HTTP_ADDR", ":8080"),
		HTTPReadTimeout:  getDur("HTTP_READ_TIMEOUT", 10*time.Second),
		HTTPWriteTimeout: getDur("HTTP_WRITE_TIMEOUT", 15*time.Second),
		HTTPIdleTimeout:  getDur("HTTP_IDLE_TIMEOUT", 60*time.Second),
		ShutdownTimeout:  getDur("HTTP_SHUTDOWN_TIMEOUT", 10*time.Second),

		DatabaseURL:              os.Getenv("DATABASE_URL"),
		DBMaxConns:               int32(getInt("DB_MAX_CONNS", 10)),
		DBMinConns:               int32(getInt("DB_MIN_CONNS", 0)),
		DBMaxConnLifetime:        getDur("DB_MAX_CONN_LIFETIME", time.Hour),
		DBStatementTimeout:       getDur("DB_STATEMENT_TIMEOUT", 5*time.Second),
		DBIdleInTxSessionTimeout: getDur("DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT", 10*time.Second),

		AdminAPIToken: os.Getenv("ADMIN_API_TOKEN"),

		PublicRateLimitRPM:   getInt("PUBLIC_RATE_LIMIT_RPM", 120),
		PublicRateLimitBurst: getInt("PUBLIC_RATE_LIMIT_BURST", 40),
	}

	if c.DatabaseURL == "" {
		return Config{}, fmt.Errorf("config: DATABASE_URL bắt buộc")
	}
	return c, nil
}

func getStr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func getDur(key string, def time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return def
	}
	return d
}
