package domain

import "errors"

// Sentinel lỗi nghiệp vụ dùng chung. Tầng api map các lỗi này sang HTTP status
// (xem internal/api/dto.WriteError). Domain KHÔNG biết gì về HTTP.
var (
	ErrNotFound     = errors.New("not found")
	ErrConflict     = errors.New("conflict")
	ErrValidation   = errors.New("validation failed")
	ErrForbidden    = errors.New("forbidden")
	ErrUnauthorized = errors.New("unauthorized")
)
