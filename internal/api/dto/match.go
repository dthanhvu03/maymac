package dto

import (
	"time"

	"github.com/dthanhvu03/maymac/internal/domain"
)

// MatchResponse là một dòng shortlist trả cho admin.
type MatchResponse struct {
	ProfileID   int64    `json:"profile_id"`
	ProfileSlug string   `json:"profile_slug"`
	ProfileName string   `json:"profile_name"`
	MatchLevel  string   `json:"match_level"`
	Reasons     []string `json:"reasons"`
	Concerns    []string `json:"concerns"`
}

func NewMatchResponses(ms []domain.MatchSummary) []MatchResponse {
	out := make([]MatchResponse, 0, len(ms))
	for _, m := range ms {
		out = append(out, MatchResponse{
			ProfileID:   m.ProfileID,
			ProfileSlug: m.ProfileSlug,
			ProfileName: m.ProfileName,
			MatchLevel:  m.MatchLevel,
			Reasons:     m.Reasons,
			Concerns:    m.Concerns,
		})
	}
	return out
}

// LeadCreateResponse trả sau khi tạo lead.
type LeadCreateResponse struct {
	PublicToken string `json:"public_token"`
	Status      string `json:"status"`
}

// LeadSummaryResponse là một dòng queue lead admin.
type LeadSummaryResponse struct {
	PublicToken string     `json:"public_token"`
	Status      string     `json:"status"`
	ProfileSlug string     `json:"profile_slug"`
	ProfileName string     `json:"profile_name"`
	BriefToken  string     `json:"brief_token"`
	CreatedAt   *time.Time `json:"created_at,omitempty"`
}

type LeadListResponse struct {
	Items   []LeadSummaryResponse `json:"items"`
	Page    int                   `json:"page"`
	PerPage int                   `json:"per_page"`
	Total   int64                 `json:"total"`
}

func NewLeadListResponse(p domain.LeadPage) LeadListResponse {
	items := make([]LeadSummaryResponse, 0, len(p.Items))
	for _, l := range p.Items {
		items = append(items, LeadSummaryResponse{
			PublicToken: l.PublicToken,
			Status:      l.Status,
			ProfileSlug: l.ProfileSlug,
			ProfileName: l.ProfileName,
			BriefToken:  l.BriefToken,
			CreatedAt:   l.CreatedAt,
		})
	}
	return LeadListResponse{Items: items, Page: p.Page, PerPage: p.PerPage, Total: p.Total}
}
