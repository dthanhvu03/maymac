// Package observability cung cấp logger structured cho toàn service.
package observability

import (
	"log/slog"
	"os"
)

// NewLogger trả về slog JSON logger. Ở dev log mức Debug, còn lại Info.
func NewLogger(env string) *slog.Logger {
	level := slog.LevelInfo
	switch env {
	case "", "dev", "development", "local":
		level = slog.LevelDebug
	}
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})
	return slog.New(handler)
}
