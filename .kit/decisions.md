# Decision Log (append-only)

> Every non-trivial technical decision. Agents read this at the start of every session and must stay consistent with it. Append; do not rewrite history.

<!-- Format per entry:
## YYYY-MM-DD — <short title>
- **Decision:** what was chosen
- **Why:** plain-language reason
- **Applies to:** paths/areas affected
-->

## (seed) — Project scaffolded
- **Decision:** Universal Agent Kit installed in `vibe` mode with the `generic` profile.
- **Why:** fast start with guardrails on.
- **Applies to:** whole repo.

## 2026-07-17 — Onboarding: chốt danh tính dự án & stack
- **Decision:** maymac là nền tảng directory + matching cho ngành gia công may mặc (V1 pilot: chuẩn hóa/xác minh dữ liệu xưởng, thu Buyer Brief, matching thủ công + theo dõi lead; KHÔNG thanh toán/escrow/đấu giá/chat/AI). Hiến pháp đã điền đầy đủ trong `.kit/constitution.md`.
- **Why:** Đọc từ spec `docs/Directory_Matching_nganh_gia_cong_may_mac_v3.3.md` + `docs/CODING_STANDARDS_Directory_Matching_v1.1.md`, xác nhận với founder.
- **Applies to:** whole repo.

## 2026-07-17 — Ngôn ngữ & stack profile
- **Decision:** Đổi `project.language` sang `vi`; đổi `stack.profile` sang `[go, nextjs]` với `roots.nextjs = apps/web` (Go ở gốc repo). Rebuild kit.
- **Why:** Toàn bộ tài liệu/UI bằng tiếng Việt; backend Go + frontend Next.js (monorepo) theo coding standards. Trước đó config để `en`/`generic` do cài đặt zero-question.
- **Applies to:** `kit.config.yaml`, các rule sinh ra (`go-conventions`, `nextjs-conventions`).
