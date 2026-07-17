package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/repository/sqlcgen"
)

// LocationRepository truy cập master data tỉnh/quận. Map sqlcgen row -> domain,
// không để sqlc row rò ra ngoài tầng repository.
type LocationRepository struct {
	q *sqlcgen.Queries
}

func NewLocationRepository(pool *pgxpool.Pool) *LocationRepository {
	return &LocationRepository{q: sqlcgen.New(pool)}
}

func (r *LocationRepository) ListProvinces(ctx context.Context) ([]domain.Province, error) {
	rows, err := r.q.ListProvinces(ctx)
	if err != nil {
		return nil, fmt.Errorf("repository: list provinces: %w", err)
	}
	provinces := make([]domain.Province, 0, len(rows))
	for _, row := range rows {
		provinces = append(provinces, domain.Province{
			Code:   row.Code,
			NameVi: row.NameVi,
			Slug:   row.Slug,
		})
	}
	return provinces, nil
}

func (r *LocationRepository) UpsertProvince(ctx context.Context, p domain.Province) error {
	err := r.q.UpsertProvince(ctx, sqlcgen.UpsertProvinceParams{
		Code:   p.Code,
		NameVi: p.NameVi,
		Slug:   p.Slug,
	})
	if err != nil {
		return fmt.Errorf("repository: upsert province %q: %w", p.Code, err)
	}
	return nil
}

func (r *LocationRepository) UpsertDistrict(ctx context.Context, d domain.District) error {
	err := r.q.UpsertDistrict(ctx, sqlcgen.UpsertDistrictParams{
		ProvinceCode: d.ProvinceCode,
		NameVi:       d.NameVi,
		Slug:         d.Slug,
	})
	if err != nil {
		return fmt.Errorf("repository: upsert district %q/%q: %w", d.ProvinceCode, d.Slug, err)
	}
	return nil
}
