// Package service chứa logic nghiệp vụ, đứng giữa handler và repository.
package service

import (
	"context"

	"github.com/dthanhvu03/maymac/internal/domain"
)

// ProvinceStore là phần repository mà LocationService cần (seam để test/mock).
type ProvinceStore interface {
	ListProvinces(ctx context.Context) ([]domain.Province, error)
}

type LocationService struct {
	store ProvinceStore
}

func NewLocationService(store ProvinceStore) *LocationService {
	return &LocationService{store: store}
}

// ListProvinces trả danh sách tỉnh/thành. Hiện chỉ ủy quyền cho repository;
// đây là chỗ đặt logic (lọc, sắp xếp nghiệp vụ) khi cần sau này.
func (s *LocationService) ListProvinces(ctx context.Context) ([]domain.Province, error) {
	return s.store.ListProvinces(ctx)
}
