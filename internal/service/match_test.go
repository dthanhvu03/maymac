package service

import (
	"context"
	"errors"
	"testing"

	"github.com/dthanhvu03/maymac/internal/domain"
)

type fakeMatchStore struct {
	briefID       int64
	briefErr      error
	matchFound    bool
	upsertCalled  bool
	createLeadErr error
	leadCreated   bool
}

func (f *fakeMatchStore) BriefIDByToken(_ context.Context, _ string) (int64, error) {
	return f.briefID, f.briefErr
}
func (f *fakeMatchStore) UpsertMatch(_ context.Context, _ int64, _ domain.MatchInput) error {
	f.upsertCalled = true
	return nil
}
func (f *fakeMatchStore) ListMatches(_ context.Context, _ int64) ([]domain.MatchSummary, error) {
	return nil, nil
}
func (f *fakeMatchStore) MatchID(_ context.Context, _, _ int64) (int64, bool, error) {
	return 7, f.matchFound, nil
}
func (f *fakeMatchStore) CreateLead(_ context.Context, _, _, _ int64, _ string) error {
	f.leadCreated = true
	return f.createLeadErr
}
func (f *fakeMatchStore) ListLeads(_ context.Context, _, _ int32) ([]domain.LeadSummary, error) {
	return nil, nil
}
func (f *fakeMatchStore) CountLeads(_ context.Context) (int64, error) { return 0, nil }

func TestMatchService_CreateMatch_BadLevel(t *testing.T) {
	store := &fakeMatchStore{briefID: 1}
	svc := NewMatchService(store)
	err := svc.CreateMatch(context.Background(), "tok", domain.MatchInput{ProfileID: 2, MatchLevel: "bogus"})
	var ve *ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("mong ValidationError, nhận %v", err)
	}
	if store.upsertCalled {
		t.Error("không được upsert khi match_level sai")
	}
}

func TestMatchService_CreateLead_RequiresMatch(t *testing.T) {
	t.Run("chưa có match -> ValidationError, không tạo lead", func(t *testing.T) {
		store := &fakeMatchStore{briefID: 1, matchFound: false}
		svc := NewMatchService(store)
		_, err := svc.CreateLead(context.Background(), "tok", 2)
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("mong ValidationError, nhận %v", err)
		}
		if store.leadCreated {
			t.Error("không được tạo lead khi chưa có match")
		}
	})

	t.Run("có match -> tạo lead created", func(t *testing.T) {
		store := &fakeMatchStore{briefID: 1, matchFound: true}
		svc := NewMatchService(store)
		res, err := svc.CreateLead(context.Background(), "tok", 2)
		if err != nil || !store.leadCreated || res.Status != domain.LeadStatusCreated || res.PublicToken == "" {
			t.Fatalf("got res=%+v err=%v created=%v", res, err, store.leadCreated)
		}
	})

	t.Run("brief không tồn tại -> ErrNotFound", func(t *testing.T) {
		store := &fakeMatchStore{briefErr: domain.ErrNotFound}
		svc := NewMatchService(store)
		_, err := svc.CreateLead(context.Background(), "x", 2)
		if !errors.Is(err, domain.ErrNotFound) {
			t.Fatalf("mong ErrNotFound, nhận %v", err)
		}
	})
}
