// Package token sinh public token ngẫu nhiên, opaque (không dùng ID tuần tự).
package token

import (
	"crypto/rand"
	"encoding/base32"
	"fmt"
	"strings"
)

// New trả về một token ngẫu nhiên 16 byte, mã base32 thường (26 ký tự, không padding).
func New() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("token: đọc random: %w", err)
	}
	enc := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)
	return strings.ToLower(enc), nil
}
