package service

import (
	"context"

	"github.com/dthanhvu03/maymac/internal/domain"
	"github.com/dthanhvu03/maymac/internal/token"
)

// MatchStore là phần repository mà MatchService cần (seam để test).
type MatchStore interface {
	BriefIDByToken(ctx context.Context, token string) (int64, error)
	UpsertMatch(ctx context.Context, briefID int64, in domain.MatchInput) error
	ListMatches(ctx context.Context, briefID int64) ([]domain.MatchSummary, error)
	MatchID(ctx context.Context, briefID, profileID int64) (int64, bool, error)
	CreateLead(ctx context.Context, briefID, profileID, matchID int64, publicToken string) error
	ListLeads(ctx context.Context, limit, offset int32) ([]domain.LeadSummary, error)
	CountLeads(ctx context.Context) (int64, error)
	GetLeadForTransition(ctx context.Context, token string) (int64, string, error)
	TransitionLead(ctx context.Context, id int64, from, to, note, lostReason string) error
}

type MatchService struct {
	store MatchStore
}

func NewMatchService(store MatchStore) *MatchService {
	return &MatchService{store: store}
}

// CreateMatch shortlist một xưởng cho brief. domain.ErrNotFound nếu brief không có;
// *ValidationError nếu match_level sai.
func (s *MatchService) CreateMatch(ctx context.Context, briefToken string, in domain.MatchInput) error {
	if !domain.IsMatchLevel(in.MatchLevel) {
		return &ValidationError{Fields: map[string][]string{"match_level": {"không hợp lệ (high|medium|low|insufficient_data)"}}}
	}
	if in.ProfileID <= 0 {
		return &ValidationError{Fields: map[string][]string{"profile_id": {errRequired}}}
	}
	briefID, err := s.store.BriefIDByToken(ctx, briefToken)
	if err != nil {
		return err
	}
	return s.store.UpsertMatch(ctx, briefID, in)
}

func (s *MatchService) ListMatches(ctx context.Context, briefToken string) ([]domain.MatchSummary, error) {
	briefID, err := s.store.BriefIDByToken(ctx, briefToken)
	if err != nil {
		return nil, err
	}
	return s.store.ListMatches(ctx, briefID)
}

// CreateLead tạo lead cho (brief × profile). Invariant §12.3: PHẢI có match trước.
// domain.ErrNotFound nếu brief không có; *ValidationError nếu chưa match;
// domain.ErrConflict nếu lead đã tồn tại.
func (s *MatchService) CreateLead(ctx context.Context, briefToken string, profileID int64) (domain.LeadCreateResult, error) {
	briefID, err := s.store.BriefIDByToken(ctx, briefToken)
	if err != nil {
		return domain.LeadCreateResult{}, err
	}
	matchID, found, err := s.store.MatchID(ctx, briefID, profileID)
	if err != nil {
		return domain.LeadCreateResult{}, err
	}
	if !found {
		return domain.LeadCreateResult{}, &ValidationError{Fields: map[string][]string{"profile_id": {"chưa có match cho xưởng này — tạo match trước"}}}
	}
	tok, err := token.New()
	if err != nil {
		return domain.LeadCreateResult{}, err
	}
	if err := s.store.CreateLead(ctx, briefID, profileID, matchID, tok); err != nil {
		return domain.LeadCreateResult{}, err
	}
	return domain.LeadCreateResult{PublicToken: tok, Status: domain.LeadStatusCreated}, nil
}

// TransitionLead đổi trạng thái lead theo state machine §17.1. Trả trạng thái mới.
// domain.ErrNotFound nếu token không có; domain.ErrConflict nếu transition không hợp lệ
// hoặc đã đổi (race); *ValidationError nếu chuyển sang lost mà thiếu/sai lost_reason.
func (s *MatchService) TransitionLead(ctx context.Context, token, toStatus, note, lostReason string) (string, error) {
	id, from, err := s.store.GetLeadForTransition(ctx, token)
	if err != nil {
		return "", err
	}
	if !domain.CanTransitionLead(from, toStatus) {
		return "", domain.ErrConflict
	}

	reasonToStore := ""
	if toStatus == domain.LeadStatusLost {
		if !domain.IsLeadLostReason(lostReason) {
			return "", &ValidationError{Fields: map[string][]string{"lost_reason": {"bắt buộc khi lost, và phải là giá trị hợp lệ"}}}
		}
		reasonToStore = lostReason
	}

	if err := s.store.TransitionLead(ctx, id, from, toStatus, note, reasonToStore); err != nil {
		return "", err
	}
	return toStatus, nil
}

func (s *MatchService) ListLeads(ctx context.Context, page, perPage int) (domain.LeadPage, error) {
	if page < 1 {
		page = 1
	}
	switch {
	case perPage < 1:
		perPage = defaultPerPage
	case perPage > maxPerPage:
		perPage = maxPerPage
	}
	offset := (page - 1) * perPage

	items, err := s.store.ListLeads(ctx, int32(perPage), int32(offset))
	if err != nil {
		return domain.LeadPage{}, err
	}
	total, err := s.store.CountLeads(ctx)
	if err != nil {
		return domain.LeadPage{}, err
	}
	return domain.LeadPage{Items: items, Total: total, Page: page, PerPage: perPage}, nil
}
