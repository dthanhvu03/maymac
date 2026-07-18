package dto

import "github.com/dthanhvu03/maymac/internal/domain"

// BriefSubmitResponse là kết quả trả buyer sau submit (chỉ token + status, không PII).
type BriefSubmitResponse struct {
	PublicToken string `json:"public_token"`
	Status      string `json:"status"`
}

func NewBriefSubmitResponse(r domain.BuyerBriefResult) BriefSubmitResponse {
	return BriefSubmitResponse{PublicToken: r.PublicToken, Status: r.Status}
}
