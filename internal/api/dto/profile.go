package dto

import "github.com/dthanhvu03/maymac/internal/domain"

// ProfileCardResponse là shape công khai của một profile trong list (allowlist).
type ProfileCardResponse struct {
	Slug              string `json:"slug"`
	Name              string `json:"name"`
	Kind              string `json:"kind"`
	Tagline           string `json:"tagline,omitempty"`
	ProvinceCode      string `json:"province_code"`
	VerificationLevel string `json:"verification_level"`
	Featured          bool   `json:"featured"`
}

// ProfileListResponse là envelope phân trang cho list profile.
type ProfileListResponse struct {
	Items   []ProfileCardResponse `json:"items"`
	Page    int                   `json:"page"`
	PerPage int                   `json:"per_page"`
	Total   int64                 `json:"total"`
}

func NewProfileListResponse(p domain.ProfilePage) ProfileListResponse {
	items := make([]ProfileCardResponse, 0, len(p.Items))
	for _, c := range p.Items {
		items = append(items, ProfileCardResponse{
			Slug:              c.Slug,
			Name:              c.Name,
			Kind:              c.Kind,
			Tagline:           c.Tagline,
			ProvinceCode:      c.ProvinceCode,
			VerificationLevel: c.VerificationLevel,
			Featured:          c.Featured,
		})
	}
	return ProfileListResponse{Items: items, Page: p.Page, PerPage: p.PerPage, Total: p.Total}
}
