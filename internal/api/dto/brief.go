package dto

import (
	"time"

	"github.com/dthanhvu03/maymac/internal/domain"
)

// BriefSubmitResponse là kết quả trả buyer sau submit (chỉ token + status, không PII).
type BriefSubmitResponse struct {
	PublicToken string `json:"public_token"`
	Status      string `json:"status"`
}

func NewBriefSubmitResponse(r domain.BuyerBriefResult) BriefSubmitResponse {
	return BriefSubmitResponse{PublicToken: r.PublicToken, Status: r.Status}
}

// BriefSummaryResponse là dòng brief trong queue admin (sau cổng auth).
type BriefSummaryResponse struct {
	PublicToken    string     `json:"public_token"`
	Status         string     `json:"status"`
	BuyerName      string     `json:"buyer_name"`
	BuyerPhone     string     `json:"buyer_phone"`
	CompanyOrBrand string     `json:"company_or_brand,omitempty"`
	SubmittedAt    *time.Time `json:"submitted_at,omitempty"`
}

// BriefListResponse là envelope phân trang cho queue admin.
type BriefListResponse struct {
	Items   []BriefSummaryResponse `json:"items"`
	Page    int                    `json:"page"`
	PerPage int                    `json:"per_page"`
	Total   int64                  `json:"total"`
}

func NewBriefListResponse(p domain.BriefPage) BriefListResponse {
	items := make([]BriefSummaryResponse, 0, len(p.Items))
	for _, b := range p.Items {
		items = append(items, BriefSummaryResponse{
			PublicToken:    b.PublicToken,
			Status:         b.Status,
			BuyerName:      b.BuyerName,
			BuyerPhone:     b.BuyerPhone,
			CompanyOrBrand: b.CompanyOrBrand,
			SubmittedAt:    b.SubmittedAt,
		})
	}
	return BriefListResponse{Items: items, Page: p.Page, PerPage: p.PerPage, Total: p.Total}
}

// BriefTransitionResponse trả trạng thái mới sau khi chuyển.
type BriefTransitionResponse struct {
	PublicToken string `json:"public_token"`
	Status      string `json:"status"`
}
