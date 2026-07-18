package domain

import "testing"

func TestCanTransitionBrief(t *testing.T) {
	tests := []struct {
		from, to string
		want     bool
	}{
		{BriefStatusSubmitted, BriefStatusUnderReview, true},
		{BriefStatusSubmitted, BriefStatusCancelled, true},
		{BriefStatusSubmitted, BriefStatusClosed, false},    // nhảy cóc
		{BriefStatusSubmitted, BriefStatusQualified, false}, // bỏ qua under_review
		{BriefStatusUnderReview, BriefStatusQualified, true},
		{BriefStatusUnderReview, BriefStatusNeedsInformation, true},
		{BriefStatusNeedsInformation, BriefStatusUnderReview, true},
		{BriefStatusQualified, BriefStatusMatching, true},
		{BriefStatusMatching, BriefStatusMatched, true},
		{BriefStatusMatched, BriefStatusClosed, true},
		{BriefStatusClosed, BriefStatusMatched, false},       // terminal
		{BriefStatusRejected, BriefStatusUnderReview, false}, // terminal
		{BriefStatusCancelled, BriefStatusSubmitted, false},  // terminal
		{"khong-ton-tai", BriefStatusSubmitted, false},
	}
	for _, tc := range tests {
		if got := CanTransitionBrief(tc.from, tc.to); got != tc.want {
			t.Errorf("CanTransitionBrief(%q,%q) = %v, muốn %v", tc.from, tc.to, got, tc.want)
		}
	}
}

func TestIsBriefStatus(t *testing.T) {
	if !IsBriefStatus(BriefStatusSubmitted) {
		t.Error("submitted phải hợp lệ")
	}
	if IsBriefStatus("bogus") {
		t.Error("bogus không được hợp lệ")
	}
}
