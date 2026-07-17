// Package handler chứa HTTP handler. Handler không chứa business logic — chỉ
// đọc request, gọi service, và map kết quả sang DTO công khai.
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/dthanhvu03/maymac/internal/api/dto"
	"github.com/dthanhvu03/maymac/internal/service"
)

type LocationHandler struct {
	svc *service.LocationService
}

func NewLocationHandler(svc *service.LocationService) *LocationHandler {
	return &LocationHandler{svc: svc}
}

// ListProvinces xử lý GET /api/provinces.
func (h *LocationHandler) ListProvinces(w http.ResponseWriter, r *http.Request) {
	provinces, err := h.svc.ListProvinces(r.Context())
	if err != nil {
		dto.WriteError(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(dto.NewProvinceResponses(provinces))
}
