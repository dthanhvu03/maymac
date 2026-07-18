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

// Regression: kẻ tấn công đổi X-Forwarded-For mỗi request KHÔNG được tạo bucket mới —
// limiter phải key theo TCP peer thật, bỏ qua header client tự đặt.
func TestRateLimit_IgnoresForwardedForSpoofing(t *testing.T) {
	rl := NewIPRateLimiter(1, 1) // burst=1: request thứ 2 từ cùng peer phải 429
	defer rl.Close()
	h := RateLimit(rl)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	call := func(xff string) int {
		req := httptest.NewRequest(http.MethodGet, "/api/x", nil)
		req.RemoteAddr = "9.9.9.9:1111" // cùng một TCP peer
		req.Header.Set("X-Forwarded-For", xff)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec.Code
	}
	if code := call("1.2.3.4"); code != http.StatusOK {
		t.Fatalf("lần 1: %d, muốn 200", code)
	}
	if code := call("5.6.7.8"); code != http.StatusTooManyRequests {
		t.Fatalf("lần 2 (XFF khác, cùng peer) phải 429, nhận %d — header đang bị dùng để tránh limit", code)
	}
}
