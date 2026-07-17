package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/dthanhvu03/maymac/internal/api/dto"
)

// Recoverer biến panic thành 500 problem+json và log kèm stack (chỉ ở log,
// không bao giờ trả stack trace ra client).
func Recoverer(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					logger.LogAttrs(r.Context(), slog.LevelError, "panic_recovered",
						slog.String("request_id", chimw.GetReqID(r.Context())),
						slog.Any("panic", rec),
						slog.String("stack", string(debug.Stack())),
					)
					dto.WriteProblem(w, r, http.StatusInternalServerError, "Internal server error", "", nil)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
