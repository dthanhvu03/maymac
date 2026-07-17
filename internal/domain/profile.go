package domain

import "time"

// ProfileCard là dữ liệu profile-level cho list công khai (allowlist — không gồm
// aggregate nội bộ hay thông tin liên hệ).
type ProfileCard struct {
	Slug              string
	Kind              string
	Name              string
	Tagline           string
	ProvinceCode      string
	VerificationLevel string
	Featured          bool
}

// ProfileFilter là bộ lọc cho list công khai. nil = không lọc theo trường đó.
type ProfileFilter struct {
	ProvinceCode    *string
	DistrictID      *int64
	CategoryID      *int64
	ProductionModel *string
	SampleSupported *bool
	MaxMOQ          *int32
}

// ProfilePage là một trang kết quả list kèm tổng số cho phân trang.
type ProfilePage struct {
	Items   []ProfileCard
	Total   int64
	Page    int
	PerPage int
}

// Category là master data ngành hàng.
type Category struct {
	ID     int64
	Slug   string
	NameVi string
}

// ProfileDetail là dữ liệu chi tiết công khai của một profile (allowlist —
// gồm contact xưởng để buyer liên hệ, KHÔNG gồm aggregate nội bộ/object_key riêng).
type ProfileDetail struct {
	Slug                string
	Kind                string
	Name                string
	Tagline             string
	Description         string
	ProvinceCode        string
	DistrictID          *int64
	Address             string
	ContactName         string
	ContactPhone        string
	ContactZalo         string
	ContactEmail        string
	WebsiteURL          string
	FacebookURL         string
	EstablishedYear     *int
	WorkerCount         *int
	ProductionLineCount *int
	VerificationLevel   string
	LastVerifiedAt      *time.Time
	Featured            bool
	Capabilities        []CapabilityDetail
}

// CapabilityDetail là một năng lực (category × production_model) trên trang detail.
type CapabilityDetail struct {
	CategorySlug               string
	CategoryName               string
	ProductionModel            string
	UsualMinOrderQty           *int
	UsualMaxOrderQty           *int
	SampleSupported            bool
	UsualSampleLeadDaysMin     *int
	UsualSampleLeadDaysMax     *int
	UsualProductionLeadDaysMin *int
	UsualProductionLeadDaysMax *int
}
