package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/dthanhvu03/maymac/internal/api/dto"
)

// AdminAuth bảo vệ route admin bằng bearer token tĩnh (pilot).
//   - token cấu hình rỗng  -> 503 (fail-closed: không vô tình để hở admin)
//   - thiếu/sai Authorization -> 401 (chung chung, không lộ chi tiết)
//
// So sánh constant-time để tránh timing attack. Token KHÔNG bao giờ được log.
func AdminAuth(configuredToken string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if configuredToken == "" {
				dto.WriteProblem(w, r, http.StatusServiceUnavailable, "Admin chưa cấu hình", "", nil)
				return
			}
			presented := bearerToken(r)
			if presented == "" || !constantTimeEqual(presented, configuredToken) {
				dto.WriteProblem(w, r, http.StatusUnauthorized, "Unauthorized", "", nil)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if len(h) <= len(prefix) || !strings.EqualFold(h[:len(prefix)], prefix) {
		return ""
	}
	return strings.TrimSpace(h[len(prefix):])
}

func constantTimeEqual(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}
