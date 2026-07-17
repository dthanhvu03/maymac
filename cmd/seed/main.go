// Command seed nạp dữ liệu vào database. Master data (tỉnh/quận) tách khỏi
// seed demo. Idempotent: chạy lại nhiều lần cho cùng kết quả (upsert).
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
	master := flag.Bool("master", false, "seed master data (tỉnh + quận vùng pilot)")
	flag.Parse()

	if err := run(*master); err != nil {
		slog.Error("seed lỗi", slog.Any("error", err))
		os.Exit(1)
	}
}

func run(master bool) error {
	if !master {
		return fmt.Errorf("chưa chọn dữ liệu để seed; dùng cờ --master")
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

	repo := repository.NewLocationRepository(pool)
	return seedMaster(ctx, logger, repo)
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
	logger.Info("seed master data xong",
		slog.Int("provinces", provinceCount),
		slog.Int("districts", districtCount),
	)
	return nil
}

// --- Dữ liệu master vùng pilot (HCM, Bình Dương, Đồng Nai) ---
// Đây là dữ liệu KHỞI ĐẦU cho pilot, có thể chỉnh sửa; không phải nguồn chân lý
// hành chính. Upsert nên cập nhật lại an toàn khi danh mục thay đổi.

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
