package domain

import "time"

// Trạng thái Lead (khớp enum lead_status). Vòng đời độc lập với Buyer Brief
// (§17.1) — KHÔNG dùng chung enum. Lead KHÔNG có shortlisted/qualified.
const (
	LeadStatusCreated       = "created"
	LeadStatusSent          = "sent"
	LeadStatusViewed        = "viewed"
	LeadStatusResponded     = "responded"
	LeadStatusQuoted        = "quoted"
	LeadStatusSampleStarted = "sample_started"
	LeadStatusWon           = "won"
	LeadStatusLost          = "lost"
	LeadStatusExpired       = "expired"
)

// leadTransitions là bản đồ chuyển trạng thái Lead hợp lệ (§17.1).
// won/lost/expired là terminal.
var leadTransitions = map[string][]string{
	LeadStatusCreated:       {LeadStatusSent, LeadStatusLost},
	LeadStatusSent:          {LeadStatusViewed, LeadStatusResponded, LeadStatusLost, LeadStatusExpired},
	LeadStatusViewed:        {LeadStatusResponded, LeadStatusLost, LeadStatusExpired},
	LeadStatusResponded:     {LeadStatusQuoted, LeadStatusLost, LeadStatusExpired},
	LeadStatusQuoted:        {LeadStatusSampleStarted, LeadStatusWon, LeadStatusLost, LeadStatusExpired},
	LeadStatusSampleStarted: {LeadStatusWon, LeadStatusLost, LeadStatusExpired},
}

// CanTransitionLead cho biết from -> to có hợp lệ theo state machine Lead không.
func CanTransitionLead(from, to string) bool {
	for _, allowed := range leadTransitions[from] {
		if allowed == to {
			return true
		}
	}
	return false
}

func IsLeadStatus(s string) bool {
	switch s {
	case LeadStatusCreated, LeadStatusSent, LeadStatusViewed, LeadStatusResponded,
		LeadStatusQuoted, LeadStatusSampleStarted, LeadStatusWon, LeadStatusLost, LeadStatusExpired:
		return true
	default:
		return false
	}
}

// Lý do mất lead (khớp enum lead_lost_reason).
const (
	LostReasonNoResponse          = "no_response"
	LostReasonMOQMismatch         = "moq_mismatch"
	LostReasonPriceMismatch       = "price_mismatch"
	LostReasonDeadlineMismatch    = "deadline_mismatch"
	LostReasonCapacityUnavailable = "capacity_unavailable"
	LostReasonCapabilityMismatch  = "capability_mismatch"
	LostReasonBuyerCancelled      = "buyer_cancelled"
	LostReasonFactoryDeclined     = "factory_declined"
	LostReasonSelectedOther       = "selected_other_factory"
	LostReasonOther               = "other"
)

func IsLeadLostReason(s string) bool {
	switch s {
	case LostReasonNoResponse, LostReasonMOQMismatch, LostReasonPriceMismatch, LostReasonDeadlineMismatch,
		LostReasonCapacityUnavailable, LostReasonCapabilityMismatch, LostReasonBuyerCancelled,
		LostReasonFactoryDeclined, LostReasonSelectedOther, LostReasonOther:
		return true
	default:
		return false
	}
}

// LeadCreateResult trả về sau khi tạo lead.
type LeadCreateResult struct {
	PublicToken string
	Status      string
}

// LeadSummary là một dòng trong queue lead admin.
type LeadSummary struct {
	PublicToken string
	Status      string
	ProfileSlug string
	ProfileName string
	BriefToken  string
	CreatedAt   *time.Time
}

// LeadPage là một trang lead kèm tổng số.
type LeadPage struct {
	Items   []LeadSummary
	Total   int64
	Page    int
	PerPage int
}
