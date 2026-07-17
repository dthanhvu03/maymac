package dto

import (
	"time"

	"github.com/dthanhvu03/maymac/internal/domain"
)

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

// CapabilityResponse là một năng lực trên trang detail.
type CapabilityResponse struct {
	CategorySlug               string `json:"category_slug"`
	CategoryName               string `json:"category_name"`
	ProductionModel            string `json:"production_model"`
	UsualMinOrderQty           *int   `json:"usual_min_order_qty,omitempty"`
	UsualMaxOrderQty           *int   `json:"usual_max_order_qty,omitempty"`
	SampleSupported            bool   `json:"sample_supported"`
	UsualSampleLeadDaysMin     *int   `json:"usual_sample_lead_days_min,omitempty"`
	UsualSampleLeadDaysMax     *int   `json:"usual_sample_lead_days_max,omitempty"`
	UsualProductionLeadDaysMin *int   `json:"usual_production_lead_days_min,omitempty"`
	UsualProductionLeadDaysMax *int   `json:"usual_production_lead_days_max,omitempty"`
}

// ProfileDetailResponse là shape công khai của trang detail (allowlist).
type ProfileDetailResponse struct {
	Slug                string               `json:"slug"`
	Name                string               `json:"name"`
	Kind                string               `json:"kind"`
	Tagline             string               `json:"tagline,omitempty"`
	Description         string               `json:"description,omitempty"`
	ProvinceCode        string               `json:"province_code"`
	DistrictID          *int64               `json:"district_id,omitempty"`
	Address             string               `json:"address,omitempty"`
	ContactName         string               `json:"contact_name,omitempty"`
	ContactPhone        string               `json:"contact_phone,omitempty"`
	ContactZalo         string               `json:"contact_zalo,omitempty"`
	ContactEmail        string               `json:"contact_email,omitempty"`
	WebsiteURL          string               `json:"website_url,omitempty"`
	FacebookURL         string               `json:"facebook_url,omitempty"`
	EstablishedYear     *int                 `json:"established_year,omitempty"`
	WorkerCount         *int                 `json:"worker_count,omitempty"`
	ProductionLineCount *int                 `json:"production_line_count,omitempty"`
	VerificationLevel   string               `json:"verification_level"`
	LastVerifiedAt      *time.Time           `json:"last_verified_at,omitempty"`
	Featured            bool                 `json:"featured"`
	Capabilities        []CapabilityResponse `json:"capabilities"`
}

func NewProfileDetailResponse(d domain.ProfileDetail) ProfileDetailResponse {
	caps := make([]CapabilityResponse, 0, len(d.Capabilities))
	for _, c := range d.Capabilities {
		caps = append(caps, CapabilityResponse{
			CategorySlug:               c.CategorySlug,
			CategoryName:               c.CategoryName,
			ProductionModel:            c.ProductionModel,
			UsualMinOrderQty:           c.UsualMinOrderQty,
			UsualMaxOrderQty:           c.UsualMaxOrderQty,
			SampleSupported:            c.SampleSupported,
			UsualSampleLeadDaysMin:     c.UsualSampleLeadDaysMin,
			UsualSampleLeadDaysMax:     c.UsualSampleLeadDaysMax,
			UsualProductionLeadDaysMin: c.UsualProductionLeadDaysMin,
			UsualProductionLeadDaysMax: c.UsualProductionLeadDaysMax,
		})
	}
	return ProfileDetailResponse{
		Slug:                d.Slug,
		Name:                d.Name,
		Kind:                d.Kind,
		Tagline:             d.Tagline,
		Description:         d.Description,
		ProvinceCode:        d.ProvinceCode,
		DistrictID:          d.DistrictID,
		Address:             d.Address,
		ContactName:         d.ContactName,
		ContactPhone:        d.ContactPhone,
		ContactZalo:         d.ContactZalo,
		ContactEmail:        d.ContactEmail,
		WebsiteURL:          d.WebsiteURL,
		FacebookURL:         d.FacebookURL,
		EstablishedYear:     d.EstablishedYear,
		WorkerCount:         d.WorkerCount,
		ProductionLineCount: d.ProductionLineCount,
		VerificationLevel:   d.VerificationLevel,
		LastVerifiedAt:      d.LastVerifiedAt,
		Featured:            d.Featured,
		Capabilities:        caps,
	}
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
