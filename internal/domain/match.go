package domain

// Mức độ phù hợp của một match (khớp enum match_level). KHÔNG hiển thị % giả.
const (
	MatchLevelHigh             = "high"
	MatchLevelMedium           = "medium"
	MatchLevelLow              = "low"
	MatchLevelInsufficientData = "insufficient_data"
)

func IsMatchLevel(s string) bool {
	switch s {
	case MatchLevelHigh, MatchLevelMedium, MatchLevelLow, MatchLevelInsufficientData:
		return true
	default:
		return false
	}
}

// MatchInput là dữ liệu admin tạo/ cập nhật một shortlist match.
type MatchInput struct {
	ProfileID  int64
	MatchLevel string
	Reasons    []string
	Concerns   []string
}

// MatchSummary là một dòng shortlist (kèm thông tin xưởng).
type MatchSummary struct {
	ProfileID   int64
	ProfileSlug string
	ProfileName string
	MatchLevel  string
	Reasons     []string
	Concerns    []string
}
