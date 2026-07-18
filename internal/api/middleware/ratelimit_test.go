package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func doGet(h http.Handler, ip string) int {
	req := httptest.NewRequest(http.MethodGet, "/api/x", nil)
	req.RemoteAddr = ip + ":12345"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec.Code
}

func TestRateLimit_BurstThen429(t *testing.T) {
	// rpm=1 (nạp lại rất chậm), burst=3 → 3 request đầu qua, thứ 4 bị 429.
	rl := NewIPRateLimiter(1, 3)
	defer rl.Close()
	h := RateLimit(rl)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for i := 1; i <= 3; i++ {
		if code := doGet(h, "1.1.1.1"); code != http.StatusOK {
			t.Fatalf("request %d: code=%d, muốn 200", i, code)
		}
	}
	if code := doGet(h, "1.1.1.1"); code != http.StatusTooManyRequests {
		t.Fatalf("request 4: code=%d, muốn 429", code)
	}
}

func TestRateLimit_PerIPIsolation(t *testing.T) {
	rl := NewIPRateLimiter(1, 1)
	defer rl.Close()
	h := RateLimit(rl)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	if code := doGet(h, "2.2.2.2"); code != http.StatusOK {
		t.Fatalf("IP A lần 1: %d", code)
	}
	if code := doGet(h, "2.2.2.2"); code != http.StatusTooManyRequests {
		t.Fatalf("IP A lần 2 phải 429, nhận %d", code)
	}
	// IP khác không bị ảnh hưởng.
	if code := doGet(h, "3.3.3.3"); code != http.StatusOK {
		t.Fatalf("IP B phải 200 (độc lập), nhận %d", code)
	}
}
