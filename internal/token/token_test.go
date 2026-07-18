package token

import (
	"regexp"
	"testing"
)

var tokenPattern = regexp.MustCompile(`^[a-z2-7]{26}$`) // base32 thường, không padding

func TestNew(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 100; i++ {
		tok, err := New()
		if err != nil {
			t.Fatalf("New() lỗi: %v", err)
		}
		if !tokenPattern.MatchString(tok) {
			t.Fatalf("token %q không đúng định dạng base32-thường-26", tok)
		}
		if seen[tok] {
			t.Fatalf("token trùng: %q", tok)
		}
		seen[tok] = true
	}
}
