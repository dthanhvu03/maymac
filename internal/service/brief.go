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

var briefProductionModels = map[string]bool{
	"cmt": true, "fob": true, "odm": true, "full_package": true,
}

// BriefStore là phần repository mà BriefService cần (seam để test).
type BriefStore interface {
	SubmitBrief(ctx context.Context, in domain.BuyerBriefInput, publicToken, idemKey, requestHash string) (domain.BuyerBriefResult, bool, error)
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

func validateBriefInput(in domain.BuyerBriefInput) *ValidationError {
	fe := map[string][]string{}
	if strings.TrimSpace(in.BuyerName) == "" {
		fe["buyer_name"] = []string{"bắt buộc"}
	}
	if strings.TrimSpace(in.BuyerPhone) == "" {
		fe["buyer_phone"] = []string{"bắt buộc"}
	}
	if len(in.Items) == 0 {
		fe["items"] = []string{"cần ít nhất một sản phẩm"}
	}
	for i, it := range in.Items {
		if it.CategoryID <= 0 {
			fe[fmt.Sprintf("items[%d].category_id", i)] = []string{"bắt buộc"}
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
