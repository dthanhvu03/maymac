# Git workflow reference — branching, commits, PRs, releases, hotfix

Loaded on demand by the `git-workflow` skill (progressive disclosure). Compiled from the
sources listed at the end. Pick a branching model for the project and record it in the
Decision Log; then follow it consistently.

## 1. Pick a branching model (record it)
Two common, safe choices:

**A) GitHub Flow (simpler — good default for small teams / continuous deploy)**
```
main
├── feature/login
├── fix/order-total
└── refactor/product-service
```
`main` is always deployable; short-lived branches off `main`; PR → review → merge → deploy.

**B) main → dev → feature (an integration branch — good for scheduled releases / QA gate)**
```
main            # production, always stable
└── dev         # integration for the next release
    ├── feature/order-management
    ├── fix/inventory-negative
    ├── hotfix/*      # emergency prod fixes (off main)
    └── release/*     # optional pre-release stabilization
```
- `main` = production. `dev` = next release. `feature/*` new work. `fix/*` dev-branch bugs.
  `hotfix/*` urgent prod fixes (off `main`). `release/*` optional test stabilization.
- **Never commit directly on `main` or `dev`.**

Both are fine; B adds a QA/staging gate at the cost of one more branch. Whatever you pick,
write it in the Decision Log so every session follows the same model.

## 2. Start a feature
```bash
git checkout dev && git pull origin dev      # (or main, per the model)
git checkout -b feature/bom-management
# …code…
git add -p                                   # stage deliberately, review as you go
git commit -m "feat: add BOM management"
git push -u origin feature/bom-management
```
One task = one branch. Don't bundle unrelated features into `feature/erp`; split into
`feature/purchase-order`, `feature/warehouse-receipt`, … each reviewable on its own.

## 3. Commits — Conventional Commits
`<type>[optional scope]: <description>` — one logical change per commit.
- **feat** — a new feature. **fix** — a bug patch. Also **refactor · chore · test · docs ·
  perf · build · ci · style**.
- Breaking change: append `!` (`feat!:`) or add a `BREAKING CHANGE:` footer.
```
feat: add create purchase order API
fix: prevent inventory quantity from becoming negative
refactor: extract order calculation service
test: add purchase order validation tests
```
Avoid `update` / `fix code` / `done` / `sửa lỗi`. Don't mix a migration, a refactor, and a
bug fix in one commit — keep history bisectable.

## 4. Stay in sync (daily)
```bash
git checkout dev && git pull origin dev
git checkout feature/bom-management && git merge dev     # merge = safe for most teams
# or, if the team is comfortable: git fetch origin && git rebase origin/dev
```
Merge is easier and lower-risk for teams new to git; rebase gives a linear history but
rewrites commits — never rebase a branch others are on.

## 5. Pull Requests
- **Small and focused** — one task; a huge PR is unreviewable and conflict-prone.
- **Description**: title `[TASK-123] <summary>`; body = What · Why · How to test · Impact.
- **Rules**: at least one approver; no self-merge (barring exceptions); don't merge on red
  tests or unresolved comments; don't force-push a shared branch.
- **Squash-merge** into the integration branch so history reads one line per task
  (`feat: add BOM management`) instead of `fix / update / fix again / done`.

## 6. Conflicts
```bash
git checkout feature/bom-management
git fetch origin && git merge origin/dev
```
Open each conflicted file, read BOTH sides (`<<<<<<< HEAD` = yours, `>>>>>>>` = theirs),
keep the correct version or combine them — never blindly delete a side. Then:
```bash
git add . && git commit -m "chore: resolve merge conflicts with dev"
```
Re-run the affected tests before pushing.

## 7. Release
```bash
# dev → main via PR, final check, merge
git checkout main && git pull origin main
git tag -a v1.2.0 -m "Release v1.2.0" && git push origin v1.2.0
git checkout dev && git merge main && git push origin dev   # keep dev in sync
```
Version = SemVer `vMAJOR.MINOR.PATCH` (breaking · feature · fix). Use the **release-check**
skill for the pre-release gate (tests green, changelog, backups, rollback, go/no-go).

## 8. Hotfix (production emergency)
Branch off `main`, NOT `dev` (dev may hold unreleased code):
```bash
git checkout main && git pull origin main
git checkout -b hotfix/order-payment-error
# …fix…
git commit -m "fix: resolve production order payment error"
```
Merge the hotfix into **BOTH `main` and `dev`** — otherwise the next release re-introduces
the bug. Tag a new patch version.

## 9. Never / protect
- Don't routinely `git push --force`, `git reset --hard`, or `git clean -fd`; NEVER on
  `main` / `dev` / `release/*`. (guard-shell blocks these.)
- Don't commit secrets: `.env`, `credentials.json`, `*.pem`, DB dumps, tokens, API keys.
  Keep `.env.example` only. If a secret is committed, **rotate it** — removing the file is
  not enough (it stays in history). The kit's generated `.gitignore` already excludes them.
- Protect `main`/`dev`: require PR + review, block force-push (branch protection settings).

## Quick rules for the whole team
```
No direct commits on main or dev.  One task = one branch.  One commit = one clear change.
Pull the integration branch before branching.  Review before merge (squash).
Hotfix merges into BOTH main and dev.  Every production release is tagged (SemVer).
Never force-push a shared branch.  Never commit secrets.
```

---

## Sources
- Conventional Commits 1.0.0. https://www.conventionalcommits.org/en/v1.0.0/
- Semantic Versioning 2.0.0. https://semver.org/
- GitHub Flow. https://docs.github.com/en/get-started/using-github/github-flow
- Git Flow (Vincent Driessen, "A successful Git branching model").
  https://nvie.com/posts/a-successful-git-branching-model/
- Atlassian — Git branching workflows (feature branch / gitflow).
  https://www.atlassian.com/git/tutorials/comparing-workflows

> Provenance note: Conventional Commits types (feat/fix + BREAKING CHANGE via `!`/footer)
> and SemVer's MAJOR/MINOR/PATCH rules were verified against source on 2026-07-16. The
> branching-model descriptions (GitHub Flow, Git Flow) follow the linked canonical docs.
