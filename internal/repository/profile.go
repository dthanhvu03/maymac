package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
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

// ProfileUpsert là input để seed một profile.
type ProfileUpsert struct {
	Slug         string
	Kind         string
	Name         string
	Tagline      string
	ProvinceCode string
	Status       string
	Featured     bool
}

// UpsertProfile dùng cho seed demo; trả về id profile.
func (r *ProfileRepository) UpsertProfile(ctx context.Context, p ProfileUpsert) (int64, error) {
	id, err := r.q.UpsertProfileBySlug(ctx, sqlcgen.UpsertProfileBySlugParams{
		Slug:         p.Slug,
		Kind:         sqlcgen.ProfileKind(p.Kind),
		Name:         p.Name,
		Tagline:      nullableString(p.Tagline),
		ProvinceCode: p.ProvinceCode,
		Status:       sqlcgen.ProfileStatus(p.Status),
		Featured:     p.Featured,
	})
	if err != nil {
		return 0, fmt.Errorf("repository: upsert profile %q: %w", p.Slug, err)
	}
	return id, nil
}

// GetDetailBySlug trả detail của một profile published theo slug (kèm capabilities).
// Trả domain.ErrNotFound nếu không có profile published với slug đó.
func (r *ProfileRepository) GetDetailBySlug(ctx context.Context, slug string) (*domain.ProfileDetail, error) {
	row, err := r.q.GetPublishedProfileBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("repository: get profile %q: %w", slug, err)
	}

	capRows, err := r.q.ListProfileCapabilities(ctx, row.ID)
	if err != nil {
		return nil, fmt.Errorf("repository: list capabilities for %q: %w", slug, err)
	}
	caps := make([]domain.CapabilityDetail, 0, len(capRows))
	for _, c := range capRows {
		caps = append(caps, domain.CapabilityDetail{
			CategorySlug:               c.CategorySlug,
			CategoryName:               c.CategoryName,
			ProductionModel:            string(c.ProductionModel),
			UsualMinOrderQty:           intFromP32(c.UsualMinOrderQty),
			UsualMaxOrderQty:           intFromP32(c.UsualMaxOrderQty),
			SampleSupported:            c.SampleSupported,
			UsualSampleLeadDaysMin:     intFromP32(c.UsualSampleLeadDaysMin),
			UsualSampleLeadDaysMax:     intFromP32(c.UsualSampleLeadDaysMax),
			UsualProductionLeadDaysMin: intFromP32(c.UsualProductionLeadDaysMin),
			UsualProductionLeadDaysMax: intFromP32(c.UsualProductionLeadDaysMax),
		})
	}

	detail := &domain.ProfileDetail{
		Slug:                row.Slug,
		Kind:                string(row.Kind),
		Name:                row.Name,
		Tagline:             derefString(row.Tagline),
		Description:         derefString(row.Description),
		ProvinceCode:        row.ProvinceCode,
		DistrictID:          row.DistrictID,
		Address:             derefString(row.Address),
		ContactName:         derefString(row.ContactName),
		ContactPhone:        derefString(row.ContactPhone),
		ContactZalo:         derefString(row.ContactZalo),
		ContactEmail:        derefString(row.ContactEmail),
		WebsiteURL:          derefString(row.WebsiteUrl),
		FacebookURL:         derefString(row.FacebookUrl),
		EstablishedYear:     intFromP16(row.EstablishedYear),
		WorkerCount:         intFromP32(row.WorkerCount),
		ProductionLineCount: intFromP32(row.ProductionLineCount),
		VerificationLevel:   string(row.VerificationLevel),
		Featured:            row.Featured,
		Capabilities:        caps,
	}
	if row.LastVerifiedAt.Valid {
		t := row.LastVerifiedAt.Time
		detail.LastVerifiedAt = &t
	}
	return detail, nil
}

// ResolveRedirect trả canonical slug cho một old_slug; domain.ErrNotFound nếu không có.
func (r *ProfileRepository) ResolveRedirect(ctx context.Context, oldSlug string) (string, error) {
	slug, err := r.q.ResolveProfileRedirect(ctx, oldSlug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", domain.ErrNotFound
		}
		return "", fmt.Errorf("repository: resolve redirect %q: %w", oldSlug, err)
	}
	return slug, nil
}

// UpsertRedirect dùng cho seed demo.
func (r *ProfileRepository) UpsertRedirect(ctx context.Context, oldSlug string, profileID int64) error {
	if err := r.q.UpsertProfileRedirect(ctx, sqlcgen.UpsertProfileRedirectParams{OldSlug: oldSlug, ProfileID: profileID}); err != nil {
		return fmt.Errorf("repository: upsert redirect %q: %w", oldSlug, err)
	}
	return nil
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

func intFromP32(p *int32) *int {
	if p == nil {
		return nil
	}
	n := int(*p)
	return &n
}

func intFromP16(p *int16) *int {
	if p == nil {
		return nil
	}
	n := int(*p)
	return &n
}
