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

const (
	maxMatchBodyBytes = 1 << 20
	msgInvalidJSON    = "JSON không hợp lệ"
)

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
		dto.WriteProblem(w, r, http.StatusBadRequest, msgInvalidJSON, "", nil)
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
		dto.WriteProblem(w, r, http.StatusBadRequest, msgInvalidJSON, "", nil)
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

type leadTransitionRequest struct {
	ToStatus   string `json:"to_status"`
	Note       string `json:"note"`
	LostReason string `json:"lost_reason"`
}

// TransitionLead xử lý POST /api/admin/leads/{token}/transition.
func (h *MatchHandler) TransitionLead(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	var req leadTransitionRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, maxMatchBodyBytes)).Decode(&req); err != nil {
		dto.WriteProblem(w, r, http.StatusBadRequest, msgInvalidJSON, "", nil)
		return
	}
	if !domain.IsLeadStatus(req.ToStatus) {
		dto.WriteProblem(w, r, http.StatusUnprocessableEntity, "Trạng thái đích không hợp lệ", "", map[string][]string{"to_status": {"không phải trạng thái lead hợp lệ"}})
		return
	}

	newStatus, err := h.svc.TransitionLead(r.Context(), token, req.ToStatus, req.Note, req.LostReason)
	if err != nil {
		var ve *service.ValidationError
		switch {
		case errors.As(err, &ve):
			dto.WriteProblem(w, r, http.StatusUnprocessableEntity, "Dữ liệu không hợp lệ", "", ve.Fields)
		case errors.Is(err, domain.ErrNotFound):
			dto.WriteProblem(w, r, http.StatusNotFound, "Không tìm thấy lead", "", nil)
		case errors.Is(err, domain.ErrConflict):
			dto.WriteProblem(w, r, http.StatusConflict, "Chuyển trạng thái không hợp lệ", "", nil)
		default:
			dto.WriteError(w, r, err)
		}
		return
	}
	writeJSON(w, http.StatusOK, dto.LeadCreateResponse{PublicToken: token, Status: newStatus})
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
