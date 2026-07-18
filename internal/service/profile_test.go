package service

import (
	"context"
	"errors"
	"testing"

	"github.com/dthanhvu03/maymac/internal/domain"
)

// fakeProfileStore là store giả để test service không cần database.
type fakeProfileStore struct {
	gotLimit  int32
	gotOffset int32

	listResult []domain.ProfileCard
	countTotal int64

	detail       *domain.ProfileDetail
	detailErr    error
	redirectSlug string
	redirectErr  error
}

func (f *fakeProfileStore) ListPublished(_ context.Context, _ domain.ProfileFilter, limit, offset int32) ([]domain.ProfileCard, error) {
	f.gotLimit = limit
	f.gotOffset = offset
	return f.listResult, nil
}

func (f *fakeProfileStore) CountPublished(_ context.Context, _ domain.ProfileFilter) (int64, error) {
	return f.countTotal, nil
}

func (f *fakeProfileStore) GetDetailBySlug(_ context.Context, _ string) (*domain.ProfileDetail, error) {
	return f.detail, f.detailErr
}

func (f *fakeProfileStore) ResolveRedirect(_ context.Context, _ string) (string, error) {
	return f.redirectSlug, f.redirectErr
}

func TestProfileService_ListProfiles_ClampAndOffset(t *testing.T) {
	tests := []struct {
		name       string
		page       int
		perPage    int
		wantLimit  int32
		wantOffset int32
	}{
		{"default per_page khi 0", 1, 0, defaultPerPage, 0},
		{"kẹp trần 50", 1, 100, maxPerPage, 0},
		{"per_page âm -> default", 1, -5, defaultPerPage, 0},
		{"giá trị hợp lệ giữ nguyên", 3, 10, 10, 20},
		{"page < 1 -> page 1", 0, 10, 10, 0},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			store := &fakeProfileStore{countTotal: 0}
			svc := NewProfileService(store)

			page, err := svc.ListProfiles(context.Background(), domain.ProfileFilter{}, tc.page, tc.perPage)
			if err != nil {
				t.Fatalf("lỗi không mong đợi: %v", err)
			}
			if store.gotLimit != tc.wantLimit {
				t.Errorf("limit = %d, muốn %d", store.gotLimit, tc.wantLimit)
			}
			if store.gotOffset != tc.wantOffset {
				t.Errorf("offset = %d, muốn %d", store.gotOffset, tc.wantOffset)
			}
			if page.PerPage != int(tc.wantLimit) {
				t.Errorf("PerPage = %d, muốn %d", page.PerPage, tc.wantLimit)
			}
		})
	}
}

func TestProfileService_GetProfileDetail(t *testing.T) {
	found := &domain.ProfileDetail{Slug: "xuong-abc"}

	t.Run("tìm thấy -> trả detail, không redirect", func(t *testing.T) {
		store := &fakeProfileStore{detail: found, detailErr: nil}
		svc := NewProfileService(store)
		d, redirect, err := svc.GetProfileDetail(context.Background(), "xuong-abc")
		if err != nil || redirect != "" || d == nil || d.Slug != "xuong-abc" {
			t.Fatalf("got d=%v redirect=%q err=%v", d, redirect, err)
		}
	})

	t.Run("không thấy nhưng có redirect -> canonical slug", func(t *testing.T) {
		store := &fakeProfileStore{
			detail: nil, detailErr: domain.ErrNotFound,
			redirectSlug: "xuong-moi", redirectErr: nil,
		}
		svc := NewProfileService(store)
		d, redirect, err := svc.GetProfileDetail(context.Background(), "xuong-cu")
		if err != nil || d != nil || redirect != "xuong-moi" {
			t.Fatalf("got d=%v redirect=%q err=%v", d, redirect, err)
		}
	})

	t.Run("không thấy và không có redirect -> ErrNotFound", func(t *testing.T) {
		store := &fakeProfileStore{
			detail: nil, detailErr: domain.ErrNotFound,
			redirectErr: domain.ErrNotFound,
		}
		svc := NewProfileService(store)
		d, redirect, err := svc.GetProfileDetail(context.Background(), "khong-co")
		if !errors.Is(err, domain.ErrNotFound) || d != nil || redirect != "" {
			t.Fatalf("got d=%v redirect=%q err=%v", d, redirect, err)
		}
	})
}
