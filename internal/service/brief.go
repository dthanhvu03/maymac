package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/token"
)

// ValidationError mang field errors để handler trả 422 problem+json.
type ValidationError struct {
	Fields map[string][]string
}

func (e *ValidationError) Error() string { return "validation failed" }

const errRequired = "bắt buộc"

var briefProductionModels = map[string]bool{
	"cmt": true, "fob": true, "odm": true, "full_package": true,
}

// BriefStore là phần repository mà BriefService cần (seam để test).
type BriefStore interface {
	SubmitBrief(ctx context.Context, in domain.BuyerBriefInput, publicToken, idemKey, requestHash string) (domain.BuyerBriefResult, bool, error)
	ListBriefs(ctx context.Context, status *string, limit, offset int32) ([]domain.BriefSummary, error)
	CountBriefs(ctx context.Context, status *string) (int64, error)
	GetBriefForTransition(ctx context.Context, token string) (int64, string, error)
	TransitionBrief(ctx context.Context, id int64, from, to, note string) error
}

type BriefService struct {
	store BriefStore
}

func NewBriefService(store BriefStore) *BriefService {
	return &BriefService{store: store}
}

// SubmitBrief validate input rồi tạo brief (idempotent theo idemKey).
// Trả (result, replayed, error); error có thể là *ValidationError hoặc domain.ErrConflict.
func (s *BriefService) SubmitBrief(ctx context.Context, in domain.BuyerBriefInput, idemKey, requestHash string) (domain.BuyerBriefResult, bool, error) {
	if verr := validateBriefInput(in); verr != nil {
		return domain.BuyerBriefResult{}, false, verr
	}
	tok, err := token.New()
	if err != nil {
		return domain.BuyerBriefResult{}, false, err
	}
	return s.store.SubmitBrief(ctx, in, tok, idemKey, requestHash)
}

// ListBriefs trả một trang brief cho admin (status nil = tất cả).
func (s *BriefService) ListBriefs(ctx context.Context, status *string, page, perPage int) (domain.BriefPage, error) {
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

	items, err := s.store.ListBriefs(ctx, status, int32(perPage), int32(offset))
	if err != nil {
		return domain.BriefPage{}, err
	}
	total, err := s.store.CountBriefs(ctx, status)
	if err != nil {
		return domain.BriefPage{}, err
	}
	return domain.BriefPage{Items: items, Total: total, Page: page, PerPage: perPage}, nil
}

// TransitionBrief đổi trạng thái brief theo state machine (§17.1). Trả trạng thái mới.
// domain.ErrNotFound nếu token không tồn tại; domain.ErrConflict nếu transition không
// hợp lệ hoặc status đã đổi dưới tay (race).
func (s *BriefService) TransitionBrief(ctx context.Context, token, toStatus, note string) (string, error) {
	id, from, err := s.store.GetBriefForTransition(ctx, token)
	if err != nil {
		return "", err
	}
	if !domain.CanTransitionBrief(from, toStatus) {
		return "", domain.ErrConflict
	}
	if err := s.store.TransitionBrief(ctx, id, from, toStatus, note); err != nil {
		return "", err
	}
	return toStatus, nil
}

func validateBriefInput(in domain.BuyerBriefInput) *ValidationError {
	fe := map[string][]string{}
	if strings.TrimSpace(in.BuyerName) == "" {
		fe["buyer_name"] = []string{errRequired}
	}
	if strings.TrimSpace(in.BuyerPhone) == "" {
		fe["buyer_phone"] = []string{errRequired}
	}
	if len(in.Items) == 0 {
		fe["items"] = []string{"cần ít nhất một sản phẩm"}
	}
	for i, it := range in.Items {
		if it.CategoryID <= 0 {
			fe[fmt.Sprintf("items[%d].category_id", i)] = []string{errRequired}
		}
		if it.EstimatedQuantity <= 0 {
			fe[fmt.Sprintf("items[%d].estimated_quantity", i)] = []string{"phải lớn hơn 0"}
		}
	}
	if in.ProductionModel != nil && !briefProductionModels[*in.ProductionModel] {
		fe["production_model"] = []string{"giá trị không hợp lệ (cmt|fob|odm|full_package)"}
	}
	if len(fe) == 0 {
		return nil
	}
	return &ValidationError{Fields: fe}
}
