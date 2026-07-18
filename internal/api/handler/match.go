package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/dthanhvu03/maymac/internal/api/dto"
	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/service"
)

const maxMatchBodyBytes = 1 << 20

type MatchHandler struct {
	svc *service.MatchService
}

func NewMatchHandler(svc *service.MatchService) *MatchHandler {
	return &MatchHandler{svc: svc}
}

type createMatchRequest struct {
	ProfileID  int64    `json:"profile_id"`
	MatchLevel string   `json:"match_level"`
	Reasons    []string `json:"reasons"`
	Concerns   []string `json:"concerns"`
}

// CreateMatch xử lý POST /api/admin/buyer-briefs/{token}/matches.
func (h *MatchHandler) CreateMatch(w http.ResponseWriter, r *http.Request) {
	briefToken := chi.URLParam(r, "token")
	var req createMatchRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, maxMatchBodyBytes)).Decode(&req); err != nil {
		dto.WriteProblem(w, r, http.StatusBadRequest, "JSON không hợp lệ", "", nil)
		return
	}
	err := h.svc.CreateMatch(r.Context(), briefToken, domain.MatchInput{
		ProfileID:  req.ProfileID,
		MatchLevel: req.MatchLevel,
		Reasons:    req.Reasons,
		Concerns:   req.Concerns,
	})
	if err != nil {
		writeConciergeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ListMatches xử lý GET /api/admin/buyer-briefs/{token}/matches.
func (h *MatchHandler) ListMatches(w http.ResponseWriter, r *http.Request) {
	matches, err := h.svc.ListMatches(r.Context(), chi.URLParam(r, "token"))
	if err != nil {
		writeConciergeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, dto.NewMatchResponses(matches))
}

type createLeadRequest struct {
	ProfileID int64 `json:"profile_id"`
}

// CreateLead xử lý POST /api/admin/buyer-briefs/{token}/leads.
func (h *MatchHandler) CreateLead(w http.ResponseWriter, r *http.Request) {
	briefToken := chi.URLParam(r, "token")
	var req createLeadRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, maxMatchBodyBytes)).Decode(&req); err != nil {
		dto.WriteProblem(w, r, http.StatusBadRequest, "JSON không hợp lệ", "", nil)
		return
	}
	result, err := h.svc.CreateLead(r.Context(), briefToken, req.ProfileID)
	if err != nil {
		writeConciergeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, dto.LeadCreateResponse{PublicToken: result.PublicToken, Status: result.Status})
}

// ListLeads xử lý GET /api/admin/leads.
func (h *MatchHandler) ListLeads(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	result, err := h.svc.ListLeads(r.Context(), atoiDefault(q.Get("page"), 1), atoiDefault(q.Get("per_page"), 0))
	if err != nil {
		writeConciergeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, dto.NewLeadListResponse(result))
}

func writeConciergeError(w http.ResponseWriter, r *http.Request, err error) {
	var ve *service.ValidationError
	switch {
	case errors.As(err, &ve):
		dto.WriteProblem(w, r, http.StatusUnprocessableEntity, "Dữ liệu không hợp lệ", "", ve.Fields)
	case errors.Is(err, domain.ErrNotFound):
		dto.WriteProblem(w, r, http.StatusNotFound, "Không tìm thấy brief", "", nil)
	case errors.Is(err, domain.ErrConflict):
		dto.WriteProblem(w, r, http.StatusConflict, "Lead cho xưởng này đã tồn tại", "", nil)
	default:
		dto.WriteError(w, r, err)
	}
}
