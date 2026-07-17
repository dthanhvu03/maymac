package handler

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/dthanhvu03/maymac/internal/api/dto"
	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/service"
)

const errMustBeInt = "phải là số nguyên"

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
	filter, fieldErrors := parseProfileFilter(q)
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
	writeJSON(w, http.StatusOK, dto.NewProfileListResponse(result))
}

// Detail xử lý GET /api/profiles/{slug}. Slug cũ được 301 về canonical (§12.8).
func (h *ProfileHandler) Detail(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	detail, redirectTo, err := h.svc.GetProfileDetail(r.Context(), slug)
	if err != nil {
		dto.WriteError(w, r, err) // ErrNotFound -> 404 problem+json
		return
	}
	if redirectTo != "" {
		http.Redirect(w, r, "/api/profiles/"+redirectTo, http.StatusMovedPermanently)
		return
	}
	writeJSON(w, http.StatusOK, dto.NewProfileDetailResponse(*detail))
}

// parseProfileFilter đọc query params thành ProfileFilter; trả field errors cho
// tham số sai định dạng (rỗng = hợp lệ).
func parseProfileFilter(q url.Values) (domain.ProfileFilter, map[string][]string) {
	fe := map[string][]string{}
	filter := domain.ProfileFilter{
		DistrictID: parseInt64Param(q, "district_id", fe),
		CategoryID: parseInt64Param(q, "category_id", fe),
		MaxMOQ:     parseInt32Param(q, "max_moq", fe),
	}
	if v := q.Get("province"); v != "" {
		filter.ProvinceCode = &v
	}
	if v := q.Get("production_model"); v != "" {
		if validProductionModels[v] {
			filter.ProductionModel = &v
		} else {
			fe["production_model"] = []string{"giá trị không hợp lệ (cmt|fob|odm|full_package)"}
		}
	}
	if v := q.Get("sample_supported"); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			filter.SampleSupported = &b
		} else {
			fe["sample_supported"] = []string{"phải là true hoặc false"}
		}
	}
	return filter, fe
}

// parseInt64Param đọc một query param số nguyên tùy chọn; ghi field error nếu sai.
func parseInt64Param(q url.Values, key string, fe map[string][]string) *int64 {
	v := q.Get(key)
	if v == "" {
		return nil
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		fe[key] = []string{errMustBeInt}
		return nil
	}
	return &n
}

func parseInt32Param(q url.Values, key string, fe map[string][]string) *int32 {
	v := q.Get(key)
	if v == "" {
		return nil
	}
	n, err := strconv.ParseInt(v, 10, 32)
	if err != nil {
		fe[key] = []string{errMustBeInt}
		return nil
	}
	n32 := int32(n)
	return &n32
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

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
