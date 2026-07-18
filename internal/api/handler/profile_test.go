package handler

import (
	"net/url"
	"testing"
)

func TestParseProfileFilter_Valid(t *testing.T) {
	q := url.Values{}
	q.Set("province", "79")
	q.Set("district_id", "12")
	q.Set("category_id", "2")
	q.Set("production_model", "full_package")
	q.Set("sample_supported", "true")
	q.Set("max_moq", "500")

	f, fe := parseProfileFilter(q)
	if len(fe) != 0 {
		t.Fatalf("không mong đợi field error: %v", fe)
	}
	if f.ProvinceCode == nil || *f.ProvinceCode != "79" {
		t.Errorf("ProvinceCode sai: %v", f.ProvinceCode)
	}
	if f.DistrictID == nil || *f.DistrictID != 12 {
		t.Errorf("DistrictID sai: %v", f.DistrictID)
	}
	if f.CategoryID == nil || *f.CategoryID != 2 {
		t.Errorf("CategoryID sai: %v", f.CategoryID)
	}
	if f.ProductionModel == nil || *f.ProductionModel != "full_package" {
		t.Errorf("ProductionModel sai: %v", f.ProductionModel)
	}
	if f.SampleSupported == nil || *f.SampleSupported != true {
		t.Errorf("SampleSupported sai: %v", f.SampleSupported)
	}
	if f.MaxMOQ == nil || *f.MaxMOQ != 500 {
		t.Errorf("MaxMOQ sai: %v", f.MaxMOQ)
	}
}

func TestParseProfileFilter_Invalid(t *testing.T) {
	tests := []struct {
		name       string
		key        string
		value      string
		wantErrKey string
	}{
		{"district_id không phải số", "district_id", "abc", "district_id"},
		{"category_id không phải số", "category_id", "x", "category_id"},
		{"max_moq không phải số", "max_moq", "1.5", "max_moq"},
		{"production_model không hợp lệ", "production_model", "xxx", "production_model"},
		{"sample_supported không phải bool", "sample_supported", "maybe", "sample_supported"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			q := url.Values{}
			q.Set(tc.key, tc.value)
			_, fe := parseProfileFilter(q)
			if _, ok := fe[tc.wantErrKey]; !ok {
				t.Errorf("mong đợi field error cho %q, nhận: %v", tc.wantErrKey, fe)
			}
		})
	}
}

func TestParseProfileFilter_Empty(t *testing.T) {
	f, fe := parseProfileFilter(url.Values{})
	if len(fe) != 0 {
		t.Fatalf("query rỗng không được có lỗi: %v", fe)
	}
	if f.ProvinceCode != nil || f.CategoryID != nil || f.ProductionModel != nil ||
		f.SampleSupported != nil || f.MaxMOQ != nil || f.DistrictID != nil {
		t.Errorf("query rỗng phải cho filter toàn nil: %+v", f)
	}
}
