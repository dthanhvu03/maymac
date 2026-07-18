package domain

import "testing"

func TestCanTransitionLead(t *testing.T) {
	tests := []struct {
		from, to string
		want     bool
	}{
		{LeadStatusCreated, LeadStatusSent, true},
		{LeadStatusCreated, LeadStatusWon, false}, // nhảy cóc
		{LeadStatusSent, LeadStatusResponded, true},
		{LeadStatusSent, LeadStatusViewed, true},
		{LeadStatusResponded, LeadStatusQuoted, true},
		{LeadStatusQuoted, LeadStatusWon, true},
		{LeadStatusQuoted, LeadStatusSampleStarted, true},
		{LeadStatusSampleStarted, LeadStatusWon, true},
		{LeadStatusCreated, LeadStatusLost, true},
		{LeadStatusWon, LeadStatusLost, false},  // terminal
		{LeadStatusLost, LeadStatusSent, false}, // terminal
		{"bogus", LeadStatusSent, false},
	}
	for _, tc := range tests {
		if got := CanTransitionLead(tc.from, tc.to); got != tc.want {
			t.Errorf("CanTransitionLead(%q,%q)=%v muốn %v", tc.from, tc.to, got, tc.want)
		}
	}
}

func TestIsLeadLostReason(t *testing.T) {
	if !IsLeadLostReason(LostReasonNoResponse) {
		t.Error("no_response phải hợp lệ")
	}
	if IsLeadLostReason("bogus") {
		t.Error("bogus không hợp lệ")
	}
}
