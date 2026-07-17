package domain

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
