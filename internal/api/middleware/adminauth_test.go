package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAdminAuth(t *testing.T) {
	okHandler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	tests := []struct {
		name       string
		configured string
		authHeader string
		wantStatus int
	}{
		{"chưa cấu hình -> 503 fail-closed", "", "Bearer secret", http.StatusServiceUnavailable},
		{"token đúng -> qua", "secret", "Bearer secret", http.StatusNoContent},
		{"token sai -> 401", "secret", "Bearer wrong", http.StatusUnauthorized},
		{"thiếu header -> 401", "secret", "", http.StatusUnauthorized},
		{"sai scheme -> 401", "secret", "Basic secret", http.StatusUnauthorized},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h := AdminAuth(tc.configured)(okHandler)
			req := httptest.NewRequest(http.MethodGet, "/api/admin/x", nil)
			if tc.authHeader != "" {
				req.Header.Set("Authorization", tc.authHeader)
			}
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != tc.wantStatus {
				t.Errorf("status = %d, muốn %d", rec.Code, tc.wantStatus)
			}
		})
	}
}
