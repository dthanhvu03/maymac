package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/dthanhvu03/maymac/internal/api/dto"
	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/service"
)

type ProfileHandler struct {
	svc *service.ProfileService
}

func NewProfileHandler(svc *service.ProfileService) *ProfileHandler {
	return &ProfileHandler{svc: svc}
}

var validProductionModels = map[string]bool{
	"cmt": true, "fob": true, "odm": true, "full_package": true,
}

// List xử lý GET /api/profiles với filter + phân trang.
func (h *ProfileHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	fieldErrors := map[string][]string{}

	filter := domain.ProfileFilter{}
	if v := q.Get("province"); v != "" {
		filter.ProvinceCode = &v
	}
	if v := q.Get("district_id"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			filter.DistrictID = &n
		} else {
			fieldErrors["district_id"] = []string{"phải là số nguyên"}
		}
	}
	if v := q.Get("category_id"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			filter.CategoryID = &n
		} else {
			fieldErrors["category_id"] = []string{"phải là số nguyên"}
		}
	}
	if v := q.Get("production_model"); v != "" {
		if validProductionModels[v] {
			filter.ProductionModel = &v
		} else {
			fieldErrors["production_model"] = []string{"giá trị không hợp lệ (cmt|fob|odm|full_package)"}
		}
	}
	if v := q.Get("sample_supported"); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			filter.SampleSupported = &b
		} else {
			fieldErrors["sample_supported"] = []string{"phải là true hoặc false"}
		}
	}
	if v := q.Get("max_moq"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 32); err == nil {
			n32 := int32(n)
			filter.MaxMOQ = &n32
		} else {
			fieldErrors["max_moq"] = []string{"phải là số nguyên"}
		}
	}

	if len(fieldErrors) > 0 {
		dto.WriteProblem(w, r, http.StatusUnprocessableEntity, "Tham số lọc không hợp lệ", "", fieldErrors)
		return
	}

	page := atoiDefault(q.Get("page"), 1)
	perPage := atoiDefault(q.Get("per_page"), 0) // 0 -> service dùng default

	result, err := h.svc.ListProfiles(r.Context(), filter, page, perPage)
	if err != nil {
		dto.WriteError(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(dto.NewProfileListResponse(result))
}

func atoiDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}
