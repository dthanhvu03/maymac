package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/repository/sqlcgen"
)

// GetLeadForTransition trả (id, currentStatus) theo token; domain.ErrNotFound nếu không có.
func (r *MatchRepository) GetLeadForTransition(ctx context.Context, token string) (int64, string, error) {
	row, err := r.q.GetLeadByToken(ctx, token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, "", domain.ErrNotFound
		}
		return 0, "", fmt.Errorf("repository: get lead %q: %w", token, err)
	}
	return row.ID, string(row.CurrentStatus), nil
}

// TransitionLead đổi status atomic (chỉ khi current_status = from) + history +
// (nếu có) lost_reason, trong một transaction. domain.ErrConflict nếu 0 dòng đổi.
func (r *MatchRepository) TransitionLead(ctx context.Context, id int64, from, to, note, lostReason string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("repository: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := sqlcgen.New(tx)
	rows, err := q.UpdateLeadStatus(ctx, sqlcgen.UpdateLeadStatusParams{
		ID:         id,
		FromStatus: sqlcgen.LeadStatus(from),
		ToStatus:   sqlcgen.LeadStatus(to),
	})
	if err != nil {
		return fmt.Errorf("repository: update lead status: %w", err)
	}
	if rows == 0 {
		return domain.ErrConflict
	}

	fromStatus := sqlcgen.LeadStatus(from)
	if err := q.InsertLeadStatusHistory(ctx, sqlcgen.InsertLeadStatusHistoryParams{
		LeadID:     id,
		FromStatus: &fromStatus,
		ToStatus:   sqlcgen.LeadStatus(to),
		Note:       nullableString(note),
	}); err != nil {
		return fmt.Errorf("repository: insert lead history: %w", err)
	}

	if lostReason != "" {
		lr := sqlcgen.LeadLostReason(lostReason)
		if err := q.UpsertLeadOutcome(ctx, sqlcgen.UpsertLeadOutcomeParams{LeadID: id, LostReason: &lr}); err != nil {
			return fmt.Errorf("repository: upsert lead outcome: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("repository: commit tx: %w", err)
	}
	return nil
}
