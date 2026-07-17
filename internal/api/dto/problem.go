// Package dto chứa shape response trả ra ngoài. problem.go implement
// application/problem+json (RFC 7807) và map lỗi domain sang HTTP status.
package dto

import (
	"encoding/json"
	"errors"
	"net/http"

	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/dthanhvu03/maymac/internal/domain"
)

const problemContentType = "application/problem+json"

// ProblemDetails theo RFC 7807. Không bao giờ chứa stack trace hay raw SQL.
type ProblemDetails struct {
	Type      string              `json:"type"`
	Title     string              `json:"title"`
	Status    int                 `json:"status"`
	Detail    string              `json:"detail,omitempty"`
	RequestID string              `json:"request_id,omitempty"`
	Errors    map[string][]string `json:"errors,omitempty"`
}

// WriteProblem ghi một response problem+json với request_id lấy từ context.
func WriteProblem(w http.ResponseWriter, r *http.Request, status int, title, detail string, fieldErrors map[string][]string) {
	p := ProblemDetails{
		Type:      "about:blank",
		Title:     title,
		Status:    status,
		Detail:    detail,
		RequestID: chimw.GetReqID(r.Context()),
		Errors:    fieldErrors,
	}
	w.Header().Set("Content-Type", problemContentType)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(p)
}

// WriteError map lỗi domain sentinel sang HTTP status phù hợp.
func WriteError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		WriteProblem(w, r, http.StatusNotFound, "Not found", "", nil)
	case errors.Is(err, domain.ErrConflict):
		WriteProblem(w, r, http.StatusConflict, "Conflict", "", nil)
	case errors.Is(err, domain.ErrValidation):
		WriteProblem(w, r, http.StatusUnprocessableEntity, "Validation failed", "", nil)
	case errors.Is(err, domain.ErrForbidden):
		WriteProblem(w, r, http.StatusForbidden, "Forbidden", "", nil)
	case errors.Is(err, domain.ErrUnauthorized):
		WriteProblem(w, r, http.StatusUnauthorized, "Unauthorized", "", nil)
	default:
		WriteProblem(w, r, http.StatusInternalServerError, "Internal server error", "", nil)
	}
}
