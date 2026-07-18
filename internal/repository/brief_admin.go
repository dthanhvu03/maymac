package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/repository/sqlcgen"
)

// ListBriefs trả một trang brief cho admin, lọc theo status (nil = tất cả).
func (r *BriefRepository) ListBriefs(ctx context.Context, status *string, limit, offset int32) ([]domain.BriefSummary, error) {
	rows, err := r.q.ListBuyerBriefs(ctx, sqlcgen.ListBuyerBriefsParams{
		Status:     briefStatusParam(status),
		PageSize:   limit,
		PageOffset: offset,
	})
	if err != nil {
		return nil, fmt.Errorf("repository: list buyer briefs: %w", err)
	}
	out := make([]domain.BriefSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.BriefSummary{
			PublicToken:    row.PublicToken,
			Status:         string(row.Status),
			BuyerName:      row.BuyerName,
			BuyerPhone:     row.BuyerPhone,
			CompanyOrBrand: derefString(row.CompanyOrBrand),
			SubmittedAt:    timePtr(row.SubmittedAt),
		})
	}
	return out, nil
}

func (r *BriefRepository) CountBriefs(ctx context.Context, status *string) (int64, error) {
	total, err := r.q.CountBuyerBriefs(ctx, briefStatusParam(status))
	if err != nil {
		return 0, fmt.Errorf("repository: count buyer briefs: %w", err)
	}
	return total, nil
}

// GetBriefForTransition trả (id, currentStatus) theo token; domain.ErrNotFound nếu không có.
func (r *BriefRepository) GetBriefForTransition(ctx context.Context, token string) (int64, string, error) {
	row, err := r.q.GetBuyerBriefByToken(ctx, token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, "", domain.ErrNotFound
		}
		return 0, "", fmt.Errorf("repository: get brief %q: %w", token, err)
	}
	return row.ID, string(row.Status), nil
}

// TransitionBrief đổi status atomic (chỉ khi status hiện tại = from) và ghi history,
// trong một transaction. Trả domain.ErrConflict nếu 0 dòng bị đổi (status đã khác).
func (r *BriefRepository) TransitionBrief(ctx context.Context, id int64, from, to, note string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("repository: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := sqlcgen.New(tx)
	rows, err := q.UpdateBriefStatus(ctx, sqlcgen.UpdateBriefStatusParams{
		ID:         id,
		FromStatus: sqlcgen.BriefStatus(from),
		ToStatus:   sqlcgen.BriefStatus(to),
	})
	if err != nil {
		return fmt.Errorf("repository: update brief status: %w", err)
	}
	if rows == 0 {
		return domain.ErrConflict
	}

	fromStatus := sqlcgen.BriefStatus(from)
	if err := q.InsertBriefStatusHistory(ctx, sqlcgen.InsertBriefStatusHistoryParams{
		BuyerBriefID: id,
		FromStatus:   &fromStatus,
		ToStatus:     sqlcgen.BriefStatus(to),
		Note:         nullableString(note),
	}); err != nil {
		return fmt.Errorf("repository: insert brief history: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("repository: commit tx: %w", err)
	}
	return nil
}

func briefStatusParam(s *string) *sqlcgen.BriefStatus {
	if s == nil {
		return nil
	}
	bs := sqlcgen.BriefStatus(*s)
	return &bs
}

func timePtr(t pgtype.Timestamptz) *time.Time {
	if !t.Valid {
		return nil
	}
	v := t.Time
	return &v
}
