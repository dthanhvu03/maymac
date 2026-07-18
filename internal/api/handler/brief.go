package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/dthanhvu03/maymac/internal/api/dto"
	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/service"
)

const maxBriefBodyBytes = 1 << 20 // 1MB

type BriefHandler struct {
	svc *service.BriefService
}

func NewBriefHandler(svc *service.BriefService) *BriefHandler {
	return &BriefHandler{svc: svc}
}

type briefItemRequest struct {
	CategoryID        int64  `json:"category_id"`
	EstimatedQuantity int32  `json:"estimated_quantity"`
	ColorsNote        string `json:"colors_note"`
	MaterialNote      string `json:"material_note"`
}

type submitBriefRequest struct {
	BuyerName             string             `json:"buyer_name"`
	BuyerPhone            string             `json:"buyer_phone"`
	BuyerZalo             string             `json:"buyer_zalo"`
	BuyerEmail            string             `json:"buyer_email"`
	CompanyOrBrand        string             `json:"company_or_brand"`
	DesiredDeadline       string             `json:"desired_deadline"` // YYYY-MM-DD
	ProductionModel       string             `json:"production_model"`
	SampleRequired        *bool              `json:"sample_required"`
	PreferredProvinceCode string             `json:"preferred_province_code"`
	PreferredDistrictID   *int64             `json:"preferred_district_id"`
	TargetPriceNote       string             `json:"target_price_note"`
	GeneralNote           string             `json:"general_note"`
	Items                 []briefItemRequest `json:"items"`
}

// Submit xử lý POST /api/buyer-briefs. Idempotent theo header Idempotency-Key.
func (h *BriefHandler) Submit(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, maxBriefBodyBytes))
	if err != nil {
		dto.WriteProblem(w, r, http.StatusBadRequest, "Không đọc được request", "", nil)
		return
	}
	var req submitBriefRequest
	if err := json.Unmarshal(body, &req); err != nil {
		dto.WriteProblem(w, r, http.StatusBadRequest, "JSON không hợp lệ", "", nil)
		return
	}

	input, fieldErrors := req.toDomain()
	if len(fieldErrors) > 0 {
		dto.WriteProblem(w, r, http.StatusUnprocessableEntity, "Dữ liệu không hợp lệ", "", fieldErrors)
		return
	}

	result, replayed, err := h.svc.SubmitBrief(r.Context(), input, r.Header.Get("Idempotency-Key"), hashBody(body))
	if err != nil {
		h.writeSubmitError(w, r, err)
		return
	}

	status := http.StatusCreated
	if replayed {
		status = http.StatusOK
	}
	writeJSON(w, status, dto.NewBriefSubmitResponse(result))
}

func (h *BriefHandler) writeSubmitError(w http.ResponseWriter, r *http.Request, err error) {
	var ve *service.ValidationError
	switch {
	case errors.As(err, &ve):
		dto.WriteProblem(w, r, http.StatusUnprocessableEntity, "Dữ liệu không hợp lệ", "", ve.Fields)
	case errors.Is(err, domain.ErrConflict):
		dto.WriteProblem(w, r, http.StatusConflict, "Idempotency-Key đã dùng cho request khác", "", nil)
	default:
		dto.WriteError(w, r, err)
	}
}

// AdminList xử lý GET /api/admin/buyer-briefs (?status=&page=&per_page=).
func (h *BriefHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	var statusFilter *string
	if s := r.URL.Query().Get("status"); s != "" {
		if !domain.IsBriefStatus(s) {
			dto.WriteProblem(w, r, http.StatusUnprocessableEntity, "Trạng thái không hợp lệ", "", map[string][]string{"status": {"không phải trạng thái brief hợp lệ"}})
			return
		}
		statusFilter = &s
	}
	page := atoiDefault(r.URL.Query().Get("page"), 1)
	perPage := atoiDefault(r.URL.Query().Get("per_page"), 0)

	result, err := h.svc.ListBriefs(r.Context(), statusFilter, page, perPage)
	if err != nil {
		dto.WriteError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, dto.NewBriefListResponse(result))
}

type transitionRequest struct {
	ToStatus string `json:"to_status"`
	Note     string `json:"note"`
}

// AdminTransition xử lý POST /api/admin/buyer-briefs/{token}/transition.
func (h *BriefHandler) AdminTransition(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	var req transitionRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, maxBriefBodyBytes)).Decode(&req); err != nil {
		dto.WriteProblem(w, r, http.StatusBadRequest, "JSON không hợp lệ", "", nil)
		return
	}
	if !domain.IsBriefStatus(req.ToStatus) {
		dto.WriteProblem(w, r, http.StatusUnprocessableEntity, "Trạng thái đích không hợp lệ", "", map[string][]string{"to_status": {"không phải trạng thái brief hợp lệ"}})
		return
	}

	newStatus, err := h.svc.TransitionBrief(r.Context(), token, req.ToStatus, req.Note)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrNotFound):
			dto.WriteProblem(w, r, http.StatusNotFound, "Không tìm thấy brief", "", nil)
		case errors.Is(err, domain.ErrConflict):
			dto.WriteProblem(w, r, http.StatusConflict, "Chuyển trạng thái không hợp lệ", "", nil)
		default:
			dto.WriteError(w, r, err)
		}
		return
	}
	writeJSON(w, http.StatusOK, dto.BriefTransitionResponse{PublicToken: token, Status: newStatus})
}

func (req submitBriefRequest) toDomain() (domain.BuyerBriefInput, map[string][]string) {
	fe := map[string][]string{}
	in := domain.BuyerBriefInput{
		BuyerName:             req.BuyerName,
		BuyerPhone:            req.BuyerPhone,
		BuyerZalo:             req.BuyerZalo,
		BuyerEmail:            req.BuyerEmail,
		CompanyOrBrand:        req.CompanyOrBrand,
		SampleRequired:        req.SampleRequired,
		PreferredProvinceCode: req.PreferredProvinceCode,
		PreferredDistrictID:   req.PreferredDistrictID,
		TargetPriceNote:       req.TargetPriceNote,
		GeneralNote:           req.GeneralNote,
		Source:                "public_api",
	}
	if req.ProductionModel != "" {
		pm := req.ProductionModel
		in.ProductionModel = &pm
	}
	if req.DesiredDeadline != "" {
		t, err := time.Parse("2006-01-02", req.DesiredDeadline)
		if err != nil {
			fe["desired_deadline"] = []string{"định dạng phải là YYYY-MM-DD"}
		} else {
			in.DesiredDeadline = &t
		}
	}
	for _, it := range req.Items {
		in.Items = append(in.Items, domain.BriefItemInput{
			CategoryID:        it.CategoryID,
			EstimatedQuantity: it.EstimatedQuantity,
			ColorsNote:        it.ColorsNote,
			MaterialNote:      it.MaterialNote,
		})
	}
	return in, fe
}

func hashBody(b []byte) string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}
