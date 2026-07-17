// Command seed nạp dữ liệu vào database. Master data (tỉnh/quận/category) tách
// khỏi seed demo. Idempotent: chạy lại nhiều lần cho cùng kết quả (upsert).
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"

	"github.com/dthanhvu03/maymac/internal/config"
	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/observability"
	"github.com/dthanhvu03/maymac/internal/repository"
)

func main() {
	master := flag.Bool("master", false, "seed master data (tỉnh + quận + category)")
	demo := flag.Bool("demo", false, "seed dữ liệu demo (profile + capability)")
	flag.Parse()

	if err := run(*master, *demo); err != nil {
		slog.Error("seed lỗi", slog.Any("error", err))
		os.Exit(1)
	}
}

func run(master, demo bool) error {
	if !master && !demo {
		return fmt.Errorf("chưa chọn dữ liệu để seed; dùng --master và/hoặc --demo")
	}

	cfg, err := config.Load()
	if err != nil {
		return err
	}
	logger := observability.NewLogger(cfg.Env)

	ctx := context.Background()
	pool, err := repository.NewPool(ctx, cfg)
	if err != nil {
		return err
	}
	defer pool.Close()

	locationRepo := repository.NewLocationRepository(pool)
	profileRepo := repository.NewProfileRepository(pool)

	if master {
		if err := seedMaster(ctx, logger, locationRepo); err != nil {
			return err
		}
	}
	if demo {
		if err := seedDemo(ctx, logger, locationRepo, profileRepo); err != nil {
			return err
		}
	}
	return nil
}

func seedMaster(ctx context.Context, logger *slog.Logger, repo *repository.LocationRepository) error {
	var provinceCount, districtCount int
	for _, p := range masterProvinces {
		if err := repo.UpsertProvince(ctx, domain.Province{Code: p.code, NameVi: p.name, Slug: p.slug}); err != nil {
			return err
		}
		provinceCount++
		for _, d := range p.districts {
			if err := repo.UpsertDistrict(ctx, domain.District{ProvinceCode: p.code, NameVi: d.name, Slug: d.slug}); err != nil {
				return err
			}
			districtCount++
		}
	}
	for i, c := range masterCategories {
		if err := repo.UpsertCategory(ctx, c.slug, c.name, int32(i)); err != nil {
			return err
		}
	}
	logger.Info("seed master data xong",
		slog.Int("provinces", provinceCount),
		slog.Int("districts", districtCount),
		slog.Int("categories", len(masterCategories)),
	)
	return nil
}

func seedDemo(ctx context.Context, logger *slog.Logger, locationRepo *repository.LocationRepository, profileRepo *repository.ProfileRepository) error {
	cats, err := locationRepo.ListCategories(ctx)
	if err != nil {
		return err
	}
	catIDBySlug := make(map[string]int64, len(cats))
	for _, c := range cats {
		catIDBySlug[c.Slug] = c.ID
	}

	var profileCount, capCount, redirectCount int
	for _, p := range demoProfiles {
		caps, redirected, err := seedDemoProfile(ctx, profileRepo, catIDBySlug, p)
		if err != nil {
			return err
		}
		profileCount++
		capCount += caps
		if redirected {
			redirectCount++
		}
	}
	logger.Info("seed demo xong",
		slog.Int("profiles", profileCount),
		slog.Int("capabilities", capCount),
		slog.Int("redirects", redirectCount),
	)
	return nil
}

// seedDemoProfile upsert một profile demo cùng capabilities và (tùy chọn) redirect.
// Trả số capability đã seed và redirect có được tạo không.
func seedDemoProfile(ctx context.Context, repo *repository.ProfileRepository, catIDBySlug map[string]int64, p profileSeed) (int, bool, error) {
	id, err := repo.UpsertProfile(ctx, repository.ProfileUpsert{
		Slug:         p.slug,
		Kind:         p.kind,
		Name:         p.name,
		Tagline:      p.tagline,
		ProvinceCode: p.provinceCode,
		Status:       p.status,
		Featured:     p.featured,
	})
	if err != nil {
		return 0, false, err
	}
	for _, c := range p.capabilities {
		catID, ok := catIDBySlug[c.categorySlug]
		if !ok {
			return 0, false, fmt.Errorf("seed demo: thiếu category %q (chạy --master trước)", c.categorySlug)
		}
		moq := c.minOrderQty
		if err := repo.UpsertCapability(ctx, id, catID, c.productionModel, &moq, c.sampleSupported); err != nil {
			return 0, false, err
		}
	}
	if p.redirectFrom != "" {
		if err := repo.UpsertRedirect(ctx, p.redirectFrom, id); err != nil {
			return 0, false, err
		}
		return len(p.capabilities), true, nil
	}
	return len(p.capabilities), false, nil
}

// --- Master data vùng pilot (HCM, Bình Dương, Đồng Nai) ---
// Dữ liệu KHỞI ĐẦU cho pilot, chỉnh sửa được; không phải nguồn chân lý hành chính.

type provinceSeed struct {
	code, name, slug string
	districts        []districtSeed
}

type districtSeed struct {
	name, slug string
}

var masterProvinces = []provinceSeed{
	{
		code: "79", name: "Thành phố Hồ Chí Minh", slug: "ho-chi-minh",
		districts: []districtSeed{
			{"Thành phố Thủ Đức", "thu-duc"},
			{"Quận 12", "quan-12"},
			{"Quận Bình Tân", "binh-tan"},
			{"Quận Tân Phú", "tan-phu"},
			{"Huyện Củ Chi", "cu-chi"},
			{"Huyện Hóc Môn", "hoc-mon"},
			{"Huyện Bình Chánh", "binh-chanh"},
		},
	},
	{
		code: "74", name: "Bình Dương", slug: "binh-duong",
		districts: []districtSeed{
			{"Thành phố Thủ Dầu Một", "thu-dau-mot"},
			{"Thành phố Thuận An", "thuan-an"},
			{"Thành phố Dĩ An", "di-an"},
			{"Thành phố Tân Uyên", "tan-uyen"},
			{"Thị xã Bến Cát", "ben-cat"},
		},
	},
	{
		code: "75", name: "Đồng Nai", slug: "dong-nai",
		districts: []districtSeed{
			{"Thành phố Biên Hòa", "bien-hoa"},
			{"Huyện Long Thành", "long-thanh"},
			{"Huyện Trảng Bom", "trang-bom"},
			{"Huyện Nhơn Trạch", "nhon-trach"},
		},
	},
}

// Slug category (master data) — dùng chung cho seed master và demo.
const (
	catAoThun  = "ao-thun"
	catPolo    = "polo"
	catSoMi    = "so-mi"
	catQuanNam = "quan-nam"
	catAoKhoac = "ao-khoac"
)

type categorySeed struct {
	slug, name string
}

var masterCategories = []categorySeed{
	{catAoThun, "Áo thun"},
	{catPolo, "Áo polo"},
	{catSoMi, "Sơ mi"},
	{catQuanNam, "Quần nam"},
	{catAoKhoac, "Áo khoác"},
}

// --- Dữ liệu demo (giả lập để test list/filter, KHÔNG phải xưởng thật) ---

type capabilitySeed struct {
	categorySlug    string
	productionModel string
	minOrderQty     int32
	sampleSupported bool
}

type profileSeed struct {
	slug, kind, name, tagline, provinceCode, status string
	featured                                        bool
	redirectFrom                                    string // slug cũ → 301 về profile này (test §12.8)
	capabilities                                    []capabilitySeed
}

var demoProfiles = []profileSeed{
	{
		slug: "xuong-may-abc", kind: "factory", name: "Xưởng may ABC",
		tagline: "Chuyên polo & áo thun full package", provinceCode: "79",
		status: "published", featured: true,
		redirectFrom: "xuong-may-cu", // slug cũ để test redirect 301
		capabilities: []capabilitySeed{
			{catPolo, "full_package", 100, true},
			{catAoThun, "cmt", 50, true},
		},
	},
	{
		slug: "nha-may-xyz", kind: "manufacturer", name: "Nhà máy XYZ",
		tagline: "FOB số lượng lớn", provinceCode: "74",
		status: "published", featured: false,
		capabilities: []capabilitySeed{
			{catPolo, "fob", 500, false},
		},
	},
	{
		slug: "xuong-def", kind: "factory", name: "Xưởng DEF",
		tagline: "Áo thun full package", provinceCode: "75",
		status: "published", featured: false,
		capabilities: []capabilitySeed{
			{catAoThun, "full_package", 200, true},
		},
	},
	{
		// Profile nháp — dùng để verify list công khai KHÔNG trả về nó.
		slug: "xuong-nhap", kind: "factory", name: "Xưởng nháp",
		tagline: "", provinceCode: "79",
		status: "draft", featured: false,
		capabilities: []capabilitySeed{
			{catPolo, "cmt", 30, true},
		},
	},
}
