package domain

// Province là một tỉnh/thành (master data). NameVi là tên hiển thị tiếng Việt.
type Province struct {
	Code   string
	NameVi string
	Slug   string
}

// District là quận/huyện thuộc một tỉnh (master data).
type District struct {
	ProvinceCode string
	NameVi       string
	Slug         string
}
