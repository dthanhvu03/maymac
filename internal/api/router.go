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
	"github.com/dthanhvu03/maymac/internal/api/handler"
	apimw "github.com/dthanhvu03/maymac/internal/api/middleware"
)

// Handlers gom các handler để truyền vào router (tránh danh sách tham số dài).
type Handlers struct {
	Location *handler.LocationHandler
	Profile  *handler.ProfileHandler
	Brief    *handler.BriefHandler
	Match    *handler.MatchHandler
}

// NewRouter trả về http.Handler đã gắn middleware, endpoint health và API.
func NewRouter(logger *slog.Logger, pool *pgxpool.Pool, adminToken string, rateLimiter *apimw.IPRateLimiter, h Handlers) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	// KHÔNG dùng chimw.RealIP: nó ghi đè RemoteAddr từ X-Forwarded-For/X-Real-IP do
	// client tự đặt, nên kẻ tấn công đổi header mỗi request là qua mặt rate limit (và
	// brute-force token admin không giới hạn). Ở pilot (traffic trực tiếp, 1 instance)
	// dùng thẳng TCP peer là đúng và không spoof được. Khi deploy SAU reverse proxy,
	// thêm middleware RealIP theo trusted-proxy CIDR allowlist (xem decisions).
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

	// API nghiệp vụ.
	r.Route("/api", func(api chi.Router) {
		api.Use(apimw.RateLimit(rateLimiter))

		api.Get("/provinces", h.Location.ListProvinces)
		api.Get("/profiles", h.Profile.List)
		api.Get("/profiles/{slug}", h.Profile.Detail)
		api.Post("/buyer-briefs", h.Brief.Submit)

		// Nhóm admin — bảo vệ bằng bearer token (fail-closed nếu chưa cấu hình).
		api.Route("/admin", func(admin chi.Router) {
			admin.Use(apimw.AdminAuth(adminToken))
			admin.Get("/buyer-briefs", h.Brief.AdminList)
			admin.Post("/buyer-briefs/{token}/transition", h.Brief.AdminTransition)
			admin.Post("/buyer-briefs/{token}/matches", h.Match.CreateMatch)
			admin.Get("/buyer-briefs/{token}/matches", h.Match.ListMatches)
			admin.Post("/buyer-briefs/{token}/leads", h.Match.CreateLead)
			admin.Get("/leads", h.Match.ListLeads)
			admin.Post("/leads/{token}/transition", h.Match.TransitionLead)
		})
	})

	return r
}

func writeJSON(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(body))
}
