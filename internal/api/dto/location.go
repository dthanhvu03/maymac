package dto

import "github.com/dthanhvu03/maymac/internal/domain"

// ProvinceResponse là shape công khai của một tỉnh (allowlist — chỉ field an toàn).
type ProvinceResponse struct {
	Code string `json:"code"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func NewProvinceResponse(p domain.Province) ProvinceResponse {
	return ProvinceResponse{Code: p.Code, Name: p.NameVi, Slug: p.Slug}
}

func NewProvinceResponses(ps []domain.Province) []ProvinceResponse {
	out := make([]ProvinceResponse, 0, len(ps))
	for _, p := range ps {
		out = append(out, NewProvinceResponse(p))
	}
	return out
}
