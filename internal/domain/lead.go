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
