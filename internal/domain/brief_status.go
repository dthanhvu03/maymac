package domain

// Trạng thái Buyer Brief (khớp enum brief_status). Dùng tên đầy đủ, KHÔNG dùng
// chung với Lead (§17.1).
const (
	BriefStatusDraft            = "draft"
	BriefStatusSubmitted        = "submitted"
	BriefStatusUnderReview      = "under_review"
	BriefStatusNeedsInformation = "needs_information"
	BriefStatusQualified        = "qualified"
	BriefStatusMatching         = "matching"
	BriefStatusMatched          = "matched"
	BriefStatusRejected         = "rejected"
	BriefStatusCancelled        = "cancelled"
	BriefStatusClosed           = "closed"
)

// briefTransitions là bản đồ chuyển trạng thái hợp lệ (§17.1). rejected/cancelled/
// closed là terminal (không có lối ra).
var briefTransitions = map[string][]string{
	BriefStatusDraft:            {BriefStatusSubmitted},
	BriefStatusSubmitted:        {BriefStatusUnderReview, BriefStatusCancelled},
	BriefStatusUnderReview:      {BriefStatusNeedsInformation, BriefStatusQualified, BriefStatusRejected, BriefStatusCancelled},
	BriefStatusNeedsInformation: {BriefStatusUnderReview, BriefStatusCancelled},
	BriefStatusQualified:        {BriefStatusMatching, BriefStatusRejected, BriefStatusCancelled},
	BriefStatusMatching:         {BriefStatusMatched, BriefStatusRejected, BriefStatusCancelled},
	BriefStatusMatched:          {BriefStatusClosed, BriefStatusCancelled},
}

// CanTransitionBrief cho biết chuyển from -> to có hợp lệ theo state machine không.
func CanTransitionBrief(from, to string) bool {
	for _, allowed := range briefTransitions[from] {
		if allowed == to {
			return true
		}
	}
	return false
}

// IsBriefStatus kiểm tra chuỗi có phải một trạng thái brief hợp lệ.
func IsBriefStatus(s string) bool {
	switch s {
	case BriefStatusDraft, BriefStatusSubmitted, BriefStatusUnderReview, BriefStatusNeedsInformation,
		BriefStatusQualified, BriefStatusMatching, BriefStatusMatched,
		BriefStatusRejected, BriefStatusCancelled, BriefStatusClosed:
		return true
	default:
		return false
	}
}
