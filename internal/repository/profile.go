package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/repository/sqlcgen"
)

type ProfileRepository struct {
	q *sqlcgen.Queries
}

func NewProfileRepository(pool *pgxpool.Pool) *ProfileRepository {
	return &ProfileRepository{q: sqlcgen.New(pool)}
}

// ListPublished trả một trang profile published theo filter (semi-join EXISTS).
func (r *ProfileRepository) ListPublished(ctx context.Context, f domain.ProfileFilter, limit, offset int32) ([]domain.ProfileCard, error) {
	rows, err := r.q.ListPublishedProfiles(ctx, sqlcgen.ListPublishedProfilesParams{
		ProvinceCode:    f.ProvinceCode,
		DistrictID:      f.DistrictID,
		CategoryID:      f.CategoryID,
		ProductionModel: productionModelParam(f.ProductionModel),
		SampleSupported: f.SampleSupported,
		MaxMoq:          f.MaxMOQ,
		PageSize:        limit,
		PageOffset:      offset,
	})
	if err != nil {
		return nil, fmt.Errorf("repository: list published profiles: %w", err)
	}
	cards := make([]domain.ProfileCard, 0, len(rows))
	for _, row := range rows {
		cards = append(cards, domain.ProfileCard{
			Slug:              row.Slug,
			Kind:              string(row.Kind),
			Name:              row.Name,
			Tagline:           derefString(row.Tagline),
			ProvinceCode:      row.ProvinceCode,
			VerificationLevel: string(row.VerificationLevel),
			Featured:          row.Featured,
		})
	}
	return cards, nil
}

// CountPublished đếm tổng profile published theo cùng filter (cho phân trang).
func (r *ProfileRepository) CountPublished(ctx context.Context, f domain.ProfileFilter) (int64, error) {
	total, err := r.q.CountPublishedProfiles(ctx, sqlcgen.CountPublishedProfilesParams{
		ProvinceCode:    f.ProvinceCode,
		DistrictID:      f.DistrictID,
		CategoryID:      f.CategoryID,
		ProductionModel: productionModelParam(f.ProductionModel),
		SampleSupported: f.SampleSupported,
		MaxMoq:          f.MaxMOQ,
	})
	if err != nil {
		return 0, fmt.Errorf("repository: count published profiles: %w", err)
	}
	return total, nil
}

// UpsertProfile dùng cho seed demo; trả về id profile.
func (r *ProfileRepository) UpsertProfile(ctx context.Context, slug, kind, name, tagline, provinceCode, status string, featured bool) (int64, error) {
	id, err := r.q.UpsertProfileBySlug(ctx, sqlcgen.UpsertProfileBySlugParams{
		Slug:         slug,
		Kind:         sqlcgen.ProfileKind(kind),
		Name:         name,
		Tagline:      nullableString(tagline),
		ProvinceCode: provinceCode,
		Status:       sqlcgen.ProfileStatus(status),
		Featured:     featured,
	})
	if err != nil {
		return 0, fmt.Errorf("repository: upsert profile %q: %w", slug, err)
	}
	return id, nil
}

// UpsertCapability dùng cho seed demo.
func (r *ProfileRepository) UpsertCapability(ctx context.Context, profileID, categoryID int64, productionModel string, minOrderQty *int32, sampleSupported bool) error {
	err := r.q.UpsertCapability(ctx, sqlcgen.UpsertCapabilityParams{
		ProfileID:        profileID,
		CategoryID:       categoryID,
		ProductionModel:  sqlcgen.ProductionModel(productionModel),
		UsualMinOrderQty: minOrderQty,
		SampleSupported:  sampleSupported,
	})
	if err != nil {
		return fmt.Errorf("repository: upsert capability profile=%d cat=%d: %w", profileID, categoryID, err)
	}
	return nil
}

func productionModelParam(s *string) *sqlcgen.ProductionModel {
	if s == nil {
		return nil
	}
	pm := sqlcgen.ProductionModel(*s)
	return &pm
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
