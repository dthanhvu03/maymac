<!-- FILE SINH TỰ ĐỘNG — ĐỪNG SỬA. Sửa engine/ hoặc kit.config.yaml rồi chạy: kit build -->

# maymac — agent instructions

Hướng dẫn agent của dự án. Luật cốt lõi ở .claude/rules/ (tự nạp). Vai trò ở .claude/agents/.

Chế độ: vibe — làm nhanh, nói tiếng người, giữ codebase nhất quán. Guardrail luôn bật.

Đọc Constitution (.kit/constitution.md) và Decision Log (.kit/decisions.md) trước khi code.

Roles live in `.claude/agents/`. Auto-loaded rules live in `.claude/rules/`. Single source: `kit.config.yaml` + `engine/`.
