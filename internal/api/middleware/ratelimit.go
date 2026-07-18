package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"github.com/dthanhvu03/maymac/internal/api/dto"
)

// IPRateLimiter giữ một token-bucket cho mỗi IP (in-memory). Không dùng Redis
// (spec hoãn) — đủ cho pilot 1 instance; nhiều instance sẽ cần shared store.
type IPRateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*ipBucket
	rps     rate.Limit
	burst   int
	ttl     time.Duration
	stop    chan struct{}
}

type ipBucket struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewIPRateLimiter tạo limiter với rpm request/phút và burst cho phép. Chạy một
// goroutine dọn bucket idle > ttl để không phình bộ nhớ.
func NewIPRateLimiter(rpm, burst int) *IPRateLimiter {
	if rpm < 1 {
		rpm = 1
	}
	if burst < 1 {
		burst = 1
	}
	rl := &IPRateLimiter{
		buckets: make(map[string]*ipBucket),
		rps:     rate.Limit(float64(rpm) / 60.0),
		burst:   burst,
		ttl:     10 * time.Minute,
		stop:    make(chan struct{}),
	}
	go rl.cleanupLoop()
	return rl
}

func (rl *IPRateLimiter) limiterFor(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	b, ok := rl.buckets[ip]
	if !ok {
		b = &ipBucket{limiter: rate.NewLimiter(rl.rps, rl.burst)}
		rl.buckets[ip] = b
	}
	b.lastSeen = time.Now()
	return b.limiter
}

func (rl *IPRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(rl.ttl)
	defer ticker.Stop()
	for {
		select {
		case <-rl.stop:
			return
		case <-ticker.C:
			rl.evictIdle()
		}
	}
}

func (rl *IPRateLimiter) evictIdle() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	cutoff := time.Now().Add(-rl.ttl)
	for ip, b := range rl.buckets {
		if b.lastSeen.Before(cutoff) {
			delete(rl.buckets, ip)
		}
	}
}

// Close dừng goroutine dọn dẹp (gọi khi shutdown).
func (rl *IPRateLimiter) Close() {
	close(rl.stop)
}

// RateLimit chặn request vượt giới hạn per-IP bằng 429 + Retry-After.
func RateLimit(rl *IPRateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !rl.limiterFor(clientIP(r)).Allow() {
				w.Header().Set("Retry-After", "1")
				dto.WriteProblem(w, r, http.StatusTooManyRequests, "Quá nhiều yêu cầu", "Vui lòng thử lại sau.", nil)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// clientIP lấy host từ RemoteAddr = TCP peer THẬT. Cố tình KHÔNG đọc X-Forwarded-For
// (client tự đặt được → spoof được). Nếu sau này chạy sau reverse proxy tin cậy, việc
// dịch XFF→client IP phải làm ở một middleware có trusted-proxy allowlist, không phải ở đây.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
