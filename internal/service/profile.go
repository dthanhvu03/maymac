package service

import (
	"context"
	"errors"

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
	GetDetailBySlug(ctx context.Context, slug string) (*domain.ProfileDetail, error)
	ResolveRedirect(ctx context.Context, oldSlug string) (string, error)
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

// GetProfileDetail trả detail theo slug. Nếu slug không phải profile published,
// thử resolve redirect: trả redirectTo (canonical slug) để handler phát 301.
// Trả (detail, "", nil) khi tìm thấy; (nil, canonical, nil) khi cần redirect;
// (nil, "", domain.ErrNotFound) khi không có gì.
func (s *ProfileService) GetProfileDetail(ctx context.Context, slug string) (*domain.ProfileDetail, string, error) {
	detail, err := s.store.GetDetailBySlug(ctx, slug)
	if err == nil {
		return detail, "", nil
	}
	if !errors.Is(err, domain.ErrNotFound) {
		return nil, "", err
	}

	canonical, rerr := s.store.ResolveRedirect(ctx, slug)
	if rerr == nil {
		return nil, canonical, nil
	}
	if errors.Is(rerr, domain.ErrNotFound) {
		return nil, "", domain.ErrNotFound
	}
	return nil, "", rerr
}
