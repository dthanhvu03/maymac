package service

import (
	"context"

	"github.com/dthanhvu03/maymac/internal/domain"
)

const (
	defaultPerPage = 20
	maxPerPage     = 50
)

// ProfileStore là phần repository mà ProfileService cần (seam để test).
type ProfileStore interface {
	ListPublished(ctx context.Context, f domain.ProfileFilter, limit, offset int32) ([]domain.ProfileCard, error)
	CountPublished(ctx context.Context, f domain.ProfileFilter) (int64, error)
}

type ProfileService struct {
	store ProfileStore
}

func NewProfileService(store ProfileStore) *ProfileService {
	return &ProfileService{store: store}
}

// ListProfiles trả một trang profile published. page 1-based; perPage kẹp
// [1, maxPerPage] với mặc định defaultPerPage.
func (s *ProfileService) ListProfiles(ctx context.Context, f domain.ProfileFilter, page, perPage int) (domain.ProfilePage, error) {
	if page < 1 {
		page = 1
	}
	switch {
	case perPage < 1:
		perPage = defaultPerPage
	case perPage > maxPerPage:
		perPage = maxPerPage
	}
	offset := (page - 1) * perPage

	items, err := s.store.ListPublished(ctx, f, int32(perPage), int32(offset))
	if err != nil {
		return domain.ProfilePage{}, err
	}
	total, err := s.store.CountPublished(ctx, f)
	if err != nil {
		return domain.ProfilePage{}, err
	}
	return domain.ProfilePage{Items: items, Total: total, Page: page, PerPage: perPage}, nil
}
