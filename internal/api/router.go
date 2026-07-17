// Package api dựng HTTP router và middleware chain. Handler nghiệp vụ sẽ được
// mount thêm ở đây khi có; hiện tại chỉ có health check.
package api

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dthanhvu03/maymac/internal/api/dto"
	apimw "github.com/dthanhvu03/maymac/internal/api/middleware"
)

// NewRouter trả về http.Handler đã gắn middleware và endpoint health.
func NewRouter(logger *slog.Logger, pool *pgxpool.Pool) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(apimw.RequestLogger(logger))
	r.Use(apimw.Recoverer(logger))

	r.NotFound(func(w http.ResponseWriter, req *http.Request) {
		dto.WriteProblem(w, req, http.StatusNotFound, "Not found", "Tài nguyên không tồn tại.", nil)
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, req *http.Request) {
		dto.WriteProblem(w, req, http.StatusMethodNotAllowed, "Method not allowed", "", nil)
	})

	// Liveness: chỉ báo process còn sống, không phụ thuộc dependency.
	r.Get("/healthz", func(w http.ResponseWriter, req *http.Request) {
		writeJSON(w, http.StatusOK, `{"status":"ok"}`)
	})

	// Readiness: có sẵn sàng nhận traffic không — kiểm tra kết nối database.
	r.Get("/readyz", func(w http.ResponseWriter, req *http.Request) {
		if pool == nil {
			dto.WriteProblem(w, req, http.StatusServiceUnavailable, "Not ready", "database pool chưa cấu hình", nil)
			return
		}
		ctx, cancel := context.WithTimeout(req.Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			dto.WriteProblem(w, req, http.StatusServiceUnavailable, "Not ready", "database không truy cập được", nil)
			return
		}
		writeJSON(w, http.StatusOK, `{"status":"ready"}`)
	})

	return r
}

func writeJSON(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(body))
}
