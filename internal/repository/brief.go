package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/repository/sqlcgen"
)

const briefIdempotencyScope = "buyer_brief_submit"

type BriefRepository struct {
	pool *pgxpool.Pool
	q    *sqlcgen.Queries
}

func NewBriefRepository(pool *pgxpool.Pool) *BriefRepository {
	return &BriefRepository{pool: pool, q: sqlcgen.New(pool)}
}

// SubmitBrief tạo một Buyer Brief (submitted) trong một transaction, idempotent
// theo idemKey. Trả (result, replayed, error). replayed=true khi trùng key đã xử lý.
// Trả domain.ErrConflict nếu cùng idemKey nhưng request khác (request_hash lệch).
func (r *BriefRepository) SubmitBrief(ctx context.Context, in domain.BuyerBriefInput, publicToken, idemKey, requestHash string) (domain.BuyerBriefResult, bool, error) {
	if idemKey != "" {
		res, replayed, handled, err := r.lookupIdempotent(ctx, idemKey, requestHash)
		if err != nil || handled {
			return res, replayed, err
		}
	}

	res, err := r.createBrief(ctx, in, publicToken, idemKey, requestHash)
	if err != nil {
		// Hai request cùng key chạy song song: request thua bị unique violation trên
		// idempotency_records → replay kết quả của request thắng (guard ở DB).
		if idemKey != "" && isUniqueViolation(err) {
			return r.replayAfterConflict(ctx, idemKey, requestHash)
		}
		return domain.BuyerBriefResult{}, false, err
	}
	return res, false, nil
}

// lookupIdempotent trả (result, replayed, handled, err). handled=true nghĩa là đã
// có bản ghi idempotency và caller nên trả kết quả này (không tạo mới).
func (r *BriefRepository) lookupIdempotent(ctx context.Context, idemKey, requestHash string) (domain.BuyerBriefResult, bool, bool, error) {
	rec, err := r.q.GetIdempotencyRecord(ctx, sqlcgen.GetIdempotencyRecordParams{
		Scope:   briefIdempotencyScope,
		KeyHash: hashHex(idemKey),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.BuyerBriefResult{}, false, false, nil
		}
		return domain.BuyerBriefResult{}, false, false, fmt.Errorf("repository: get idempotency: %w", err)
	}
	if rec.RequestHash != requestHash {
		return domain.BuyerBriefResult{}, false, true, domain.ErrConflict
	}
	return domain.BuyerBriefResult{PublicToken: derefString(rec.ResourcePublicToken), Status: "submitted"}, true, true, nil
}

func (r *BriefRepository) createBrief(ctx context.Context, in domain.BuyerBriefInput, publicToken, idemKey, requestHash string) (domain.BuyerBriefResult, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.BuyerBriefResult{}, fmt.Errorf("repository: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }() // no-op sau Commit

	q := sqlcgen.New(tx)

	id, err := q.InsertBuyerBrief(ctx, sqlcgen.InsertBuyerBriefParams{
		PublicToken:           publicToken,
		BuyerName:             in.BuyerName,
		BuyerPhone:            in.BuyerPhone,
		BuyerZalo:             nullableString(in.BuyerZalo),
		BuyerEmail:            nullableString(in.BuyerEmail),
		CompanyOrBrand:        nullableString(in.CompanyOrBrand),
		DesiredDeadline:       dateFromPtr(in.DesiredDeadline),
		ProductionModel:       productionModelParam(in.ProductionModel),
		SampleRequired:        in.SampleRequired,
		PreferredProvinceCode: nullableString(in.PreferredProvinceCode),
		PreferredDistrictID:   in.PreferredDistrictID,
		TargetPriceNote:       nullableString(in.TargetPriceNote),
		GeneralNote:           nullableString(in.GeneralNote),
		Source:                nullableString(in.Source),
	})
	if err != nil {
		return domain.BuyerBriefResult{}, fmt.Errorf("repository: insert buyer brief: %w", err)
	}

	for _, it := range in.Items {
		if err := q.InsertBuyerBriefItem(ctx, sqlcgen.InsertBuyerBriefItemParams{
			BuyerBriefID:      id,
			CategoryID:        it.CategoryID,
			EstimatedQuantity: it.EstimatedQuantity,
			ColorsNote:        nullableString(it.ColorsNote),
			MaterialNote:      nullableString(it.MaterialNote),
		}); err != nil {
			return domain.BuyerBriefResult{}, fmt.Errorf("repository: insert brief item: %w", err)
		}
	}

	if err := q.InsertBriefStatusHistory(ctx, sqlcgen.InsertBriefStatusHistoryParams{
		BuyerBriefID: id,
		FromStatus:   nil,
		ToStatus:     sqlcgen.BriefStatusSubmitted,
	}); err != nil {
		return domain.BuyerBriefResult{}, fmt.Errorf("repository: insert brief history: %w", err)
	}

	if idemKey != "" {
		if err := insertIdempotency(ctx, q, idemKey, requestHash, publicToken); err != nil {
			return domain.BuyerBriefResult{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.BuyerBriefResult{}, fmt.Errorf("repository: commit tx: %w", err)
	}
	return domain.BuyerBriefResult{PublicToken: publicToken, Status: "submitted"}, nil
}

func insertIdempotency(ctx context.Context, q *sqlcgen.Queries, idemKey, requestHash, publicToken string) error {
	status := int32(201)
	rtype := "buyer_brief"
	return q.InsertIdempotencyRecord(ctx, sqlcgen.InsertIdempotencyRecordParams{
		Scope:               briefIdempotencyScope,
		KeyHash:             hashHex(idemKey),
		RequestHash:         requestHash,
		ResourceType:        &rtype,
		ResourcePublicToken: &publicToken,
		ResponseStatus:      &status,
		ExpiresAt:           timestamptz(time.Now().Add(24 * time.Hour)),
	})
}

func (r *BriefRepository) replayAfterConflict(ctx context.Context, idemKey, requestHash string) (domain.BuyerBriefResult, bool, error) {
	res, replayed, handled, err := r.lookupIdempotent(ctx, idemKey, requestHash)
	if err != nil {
		return domain.BuyerBriefResult{}, false, err
	}
	if !handled {
		return domain.BuyerBriefResult{}, false, fmt.Errorf("repository: idempotency record biến mất sau conflict")
	}
	return res, replayed, nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func hashHex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

func dateFromPtr(t *time.Time) pgtype.Date {
	if t == nil {
		return pgtype.Date{}
	}
	return pgtype.Date{Time: *t, Valid: true}
}

func timestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: true}
}
