---
id: onboard
title: Read the project and finish setup
description: On first use, have the agent read your codebase and fill in the project's constitution — what it is, who it's for, what it must never do, and its stack — then confirm with you. Turns a zero-question install into an accurate setup without a cold interview.
argument-hint: "[anything you want to add about the project]"
---

# /onboard

Finish setting up the kit by **reading the project instead of interrogating the user**. Run this once after `smkit init` (or whenever `.kit/constitution.md` is still placeholders).

1. **Read the project.** Look at the `README`, the manifest (`package.json` / `go.mod` / `pyproject.toml` / …), the folder structure, and a few key files. Infer what this project is, who it's for, the stack(s), and any obvious high-stakes "must never" (money, auth, personal data, production).
2. **Draft the constitution** into `.kit/constitution.md`, in the project's language (`kit.config.yaml` → `project.language`):
   - **What we are building** — one plain-language paragraph.
   - **Who uses it** — the real users.
   - **Must never happen** — the concrete, high-stakes lines for THIS project.
3. **Confirm, don't assume.** Present the draft in plain language and ask the founder to confirm or correct — *"You're building X for Y, and it must never Z — right?"* — then adjust. A couple of yes/no confirmations is enough; don't lecture.
4. **Reconcile the stack.** Compare `kit.config.yaml`'s `stack.profile` with what you actually see. If a stack is missing/wrong, or a monorepo needs per-folder `roots` (e.g. `go: apps/api`, `nextjs: apps/web`), propose the change, get a nod, edit the config, and rebuild (`smkit build`).
5. **Record it.** Save the constitution, note any real decisions in `.kit/decisions.md`, and give a one-line summary of the setup. From here the consistency rules keep the AI aligned with the actual project.

Scale to the mode: `vibe` = a short draft + one confirmation; `standard` / `strict` = the full constitution and a recorded sign-off. **Never overwrite a constitution the user has already written** without asking — only fill placeholders or propose edits.
