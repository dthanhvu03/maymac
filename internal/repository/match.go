package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/repository/sqlcgen"
)

// MatchRepository lo phần concierge: shortlist (brief_matches) và tạo Lead.
type MatchRepository struct {
	pool *pgxpool.Pool
	q    *sqlcgen.Queries
}

func NewMatchRepository(pool *pgxpool.Pool) *MatchRepository {
	return &MatchRepository{pool: pool, q: sqlcgen.New(pool)}
}

// BriefIDByToken trả id brief theo public_token; domain.ErrNotFound nếu không có.
func (r *MatchRepository) BriefIDByToken(ctx context.Context, token string) (int64, error) {
	row, err := r.q.GetBuyerBriefByToken(ctx, token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, domain.ErrNotFound
		}
		return 0, fmt.Errorf("repository: get brief %q: %w", token, err)
	}
	return row.ID, nil
}

// UpsertMatch tạo/cập nhật một shortlist match cho (briefID, profileID).
func (r *MatchRepository) UpsertMatch(ctx context.Context, briefID int64, in domain.MatchInput) error {
	_, err := r.q.UpsertBriefMatch(ctx, sqlcgen.UpsertBriefMatchParams{
		BuyerBriefID: briefID,
		ProfileID:    in.ProfileID,
		MatchLevel:   sqlcgen.MatchLevel(in.MatchLevel),
		Reasons:      jsonArray(in.Reasons),
		Concerns:     jsonArray(in.Concerns),
	})
	if err != nil {
		return fmt.Errorf("repository: upsert match brief=%d profile=%d: %w", briefID, in.ProfileID, err)
	}
	return nil
}

func (r *MatchRepository) ListMatches(ctx context.Context, briefID int64) ([]domain.MatchSummary, error) {
	rows, err := r.q.ListBriefMatches(ctx, briefID)
	if err != nil {
		return nil, fmt.Errorf("repository: list matches brief=%d: %w", briefID, err)
	}
	out := make([]domain.MatchSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.MatchSummary{
			ProfileID:   row.ProfileID,
			ProfileSlug: row.ProfileSlug,
			ProfileName: row.ProfileName,
			MatchLevel:  string(row.MatchLevel),
			Reasons:     parseJSONArray(row.Reasons),
			Concerns:    parseJSONArray(row.Concerns),
		})
	}
	return out, nil
}

// MatchID trả (id, found) của match cho (briefID, profileID).
func (r *MatchRepository) MatchID(ctx context.Context, briefID, profileID int64) (int64, bool, error) {
	id, err := r.q.GetBriefMatchID(ctx, sqlcgen.GetBriefMatchIDParams{BuyerBriefID: briefID, ProfileID: profileID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, false, nil
		}
		return 0, false, fmt.Errorf("repository: get match id: %w", err)
	}
	return id, true, nil
}

// CreateLead tạo lead (created) + history trong transaction. domain.ErrConflict
// nếu lead cho (brief,profile) đã tồn tại (UNIQUE).
func (r *MatchRepository) CreateLead(ctx context.Context, briefID, profileID, matchID int64, publicToken string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("repository: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := sqlcgen.New(tx)
	id, err := q.InsertLead(ctx, sqlcgen.InsertLeadParams{
		PublicToken:  publicToken,
		BuyerBriefID: briefID,
		ProfileID:    profileID,
		BriefMatchID: &matchID,
	})
	if err != nil {
		if isUniqueViolation(err) {
			return domain.ErrConflict
		}
		return fmt.Errorf("repository: insert lead: %w", err)
	}
	if err := q.InsertLeadStatusHistory(ctx, sqlcgen.InsertLeadStatusHistoryParams{
		LeadID:   id,
		ToStatus: sqlcgen.LeadStatusCreated,
	}); err != nil {
		return fmt.Errorf("repository: insert lead history: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("repository: commit tx: %w", err)
	}
	return nil
}

func (r *MatchRepository) ListLeads(ctx context.Context, limit, offset int32) ([]domain.LeadSummary, error) {
	rows, err := r.q.ListLeads(ctx, sqlcgen.ListLeadsParams{PageSize: limit, PageOffset: offset})
	if err != nil {
		return nil, fmt.Errorf("repository: list leads: %w", err)
	}
	out := make([]domain.LeadSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.LeadSummary{
			PublicToken: row.PublicToken,
			Status:      string(row.CurrentStatus),
			ProfileSlug: row.ProfileSlug,
			ProfileName: row.ProfileName,
			BriefToken:  row.BriefToken,
			CreatedAt:   timePtr(row.CreatedAt),
		})
	}
	return out, nil
}

func (r *MatchRepository) CountLeads(ctx context.Context) (int64, error) {
	n, err := r.q.CountLeads(ctx)
	if err != nil {
		return 0, fmt.Errorf("repository: count leads: %w", err)
	}
	return n, nil
}

// jsonArray marshal []string -> jsonb; nil/empty -> "[]" (cột NOT NULL DEFAULT '[]').
func jsonArray(items []string) []byte {
	if len(items) == 0 {
		return []byte("[]")
	}
	b, err := json.Marshal(items)
	if err != nil {
		return []byte("[]")
	}
	return b
}

func parseJSONArray(b []byte) []string {
	if len(b) == 0 {
		return nil
	}
	var out []string
	if err := json.Unmarshal(b, &out); err != nil {
		return nil
	}
	return out
}
