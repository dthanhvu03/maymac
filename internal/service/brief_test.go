package service

import (
	"context"
	"errors"
	"testing"

	"github.com/dthanhvu03/maymac/internal/domain"
)

type fakeBriefStore struct {
	called   bool
	gotToken string
	result   domain.BuyerBriefResult
	replayed bool
	err      error

	// admin
	transitionFrom   string
	transitionErr    error
	getForTransErr   error
	transitionCalled bool
}

func (f *fakeBriefStore) SubmitBrief(_ context.Context, _ domain.BuyerBriefInput, publicToken, _, _ string) (domain.BuyerBriefResult, bool, error) {
	f.called = true
	f.gotToken = publicToken
	return f.result, f.replayed, f.err
}

func (f *fakeBriefStore) ListBriefs(_ context.Context, _ *string, _, _ int32) ([]domain.BriefSummary, error) {
	return nil, nil
}

func (f *fakeBriefStore) CountBriefs(_ context.Context, _ *string) (int64, error) {
	return 0, nil
}

func (f *fakeBriefStore) GetBriefForTransition(_ context.Context, _ string) (int64, string, error) {
	if f.getForTransErr != nil {
		return 0, "", f.getForTransErr
	}
	return 1, f.transitionFrom, nil
}

func (f *fakeBriefStore) TransitionBrief(_ context.Context, _ int64, _, _, _ string) error {
	f.transitionCalled = true
	return f.transitionErr
}

func validInput() domain.BuyerBriefInput {
	return domain.BuyerBriefInput{
		BuyerName:  "Nguyễn A",
		BuyerPhone: "0900000000",
		Items:      []domain.BriefItemInput{{CategoryID: 2, EstimatedQuantity: 100}},
	}
}

func TestValidateBriefInput(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(*domain.BuyerBriefInput)
		wantKey string // field error key mong đợi; "" = hợp lệ
	}{
		{"hợp lệ", func(*domain.BuyerBriefInput) {}, ""},
		{"thiếu tên", func(in *domain.BuyerBriefInput) { in.BuyerName = "" }, "buyer_name"},
		{"thiếu sđt", func(in *domain.BuyerBriefInput) { in.BuyerPhone = "  " }, "buyer_phone"},
		{"không có item", func(in *domain.BuyerBriefInput) { in.Items = nil }, "items"},
		{"qty <= 0", func(in *domain.BuyerBriefInput) { in.Items[0].EstimatedQuantity = 0 }, "items[0].estimated_quantity"},
		{"category thiếu", func(in *domain.BuyerBriefInput) { in.Items[0].CategoryID = 0 }, "items[0].category_id"},
		{"production_model sai", func(in *domain.BuyerBriefInput) { m := "xxx"; in.ProductionModel = &m }, "production_model"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			in := validInput()
			tc.mutate(&in)
			verr := validateBriefInput(in)
			if tc.wantKey == "" {
				if verr != nil {
					t.Fatalf("mong hợp lệ, nhận: %v", verr.Fields)
				}
				return
			}
			if verr == nil {
				t.Fatalf("mong field error %q, nhưng hợp lệ", tc.wantKey)
			}
			if _, ok := verr.Fields[tc.wantKey]; !ok {
				t.Errorf("mong field error %q, nhận: %v", tc.wantKey, verr.Fields)
			}
		})
	}
}

func TestBriefService_SubmitBrief_ValidCallsStore(t *testing.T) {
	store := &fakeBriefStore{result: domain.BuyerBriefResult{PublicToken: "tok", Status: "submitted"}}
	svc := NewBriefService(store)

	res, replayed, err := svc.SubmitBrief(context.Background(), validInput(), "key-1", "hash-1")
	if err != nil {
		t.Fatalf("lỗi không mong đợi: %v", err)
	}
	if !store.called {
		t.Fatal("store.SubmitBrief không được gọi")
	}
	if store.gotToken == "" {
		t.Error("service phải sinh public token không rỗng")
	}
	if replayed || res.Status != "submitted" {
		t.Errorf("kết quả sai: %+v replayed=%v", res, replayed)
	}
}

func TestBriefService_TransitionBrief(t *testing.T) {
	t.Run("transition hợp lệ -> gọi store, trả status mới", func(t *testing.T) {
		store := &fakeBriefStore{transitionFrom: domain.BriefStatusSubmitted}
		svc := NewBriefService(store)
		got, err := svc.TransitionBrief(context.Background(), "tok", domain.BriefStatusUnderReview, "")
		if err != nil || got != domain.BriefStatusUnderReview || !store.transitionCalled {
			t.Fatalf("got=%q err=%v called=%v", got, err, store.transitionCalled)
		}
	})

	t.Run("transition không hợp lệ -> ErrConflict, không gọi store", func(t *testing.T) {
		store := &fakeBriefStore{transitionFrom: domain.BriefStatusSubmitted}
		svc := NewBriefService(store)
		_, err := svc.TransitionBrief(context.Background(), "tok", domain.BriefStatusClosed, "")
		if !errors.Is(err, domain.ErrConflict) {
			t.Fatalf("mong ErrConflict, nhận %v", err)
		}
		if store.transitionCalled {
			t.Error("không được gọi TransitionBrief khi transition sai")
		}
	})

	t.Run("brief không tồn tại -> ErrNotFound", func(t *testing.T) {
		store := &fakeBriefStore{getForTransErr: domain.ErrNotFound}
		svc := NewBriefService(store)
		_, err := svc.TransitionBrief(context.Background(), "khong-co", domain.BriefStatusUnderReview, "")
		if !errors.Is(err, domain.ErrNotFound) {
			t.Fatalf("mong ErrNotFound, nhận %v", err)
		}
	})
}

func TestBriefService_SubmitBrief_InvalidSkipsStore(t *testing.T) {
	store := &fakeBriefStore{}
	svc := NewBriefService(store)

	in := validInput()
	in.Items = nil
	_, _, err := svc.SubmitBrief(context.Background(), in, "", "")

	var ve *ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("mong ValidationError, nhận: %v", err)
	}
	if store.called {
		t.Error("store không được gọi khi input sai")
	}
}
