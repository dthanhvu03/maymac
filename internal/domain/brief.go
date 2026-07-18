package domain

import "time"

// BuyerBriefInput là dữ liệu buyer gửi khi submit yêu cầu sản xuất.
// Các trường con trỏ/rỗng là tùy chọn (§6.3: không ép nhập mọi chi tiết lần đầu).
type BuyerBriefInput struct {
	BuyerName             string
	BuyerPhone            string
	BuyerZalo             string
	BuyerEmail            string
	CompanyOrBrand        string
	DesiredDeadline       *time.Time
	ProductionModel       *string
	SampleRequired        *bool
	PreferredProvinceCode string
	PreferredDistrictID   *int64
	TargetPriceNote       string
	GeneralNote           string
	Source                string
	Items                 []BriefItemInput
}

// BriefItemInput là một dòng sản phẩm trong brief.
type BriefItemInput struct {
	CategoryID        int64
	EstimatedQuantity int32
	ColorsNote        string
	MaterialNote      string
}

// BuyerBriefResult là kết quả trả về buyer sau khi submit.
type BuyerBriefResult struct {
	PublicToken string
	Status      string
}

// BriefSummary là dòng brief trong queue admin (sau cổng auth — có contact buyer).
type BriefSummary struct {
	PublicToken    string
	Status         string
	BuyerName      string
	BuyerPhone     string
	CompanyOrBrand string
	SubmittedAt    *time.Time
}

// BriefPage là một trang brief kèm tổng số.
type BriefPage struct {
	Items   []BriefSummary
	Total   int64
	Page    int
	PerPage int
}
