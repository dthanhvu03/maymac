---
name: git-workflow
description: Use when starting a feature, opening a pull request, resolving a conflict, cutting a release, or shipping a hotfix. Invoke for the branching model, conventional commits, PR discipline, tagging, and hotfix flow the team follows.
license: Apache-2.0
compatibility: Requires git.
metadata:
  sixmen-version: "1.0.0"
  sixmen-trust-tier: "T0"
  sixmen-owner: platform-team
---

# Git Workflow skill

Operate git the way a team can trust — small branches, clean history, reviewed merges,
tagged releases. Follow the branching model recorded in the Decision Log; if none is
recorded, propose one from **[references/git-workflow-guide.md](references/git-workflow-guide.md)**
and record it.

## Workflow
1. **Start** from the up-to-date integration branch: `git checkout <dev|main> && git pull`,
   then `git checkout -b <type>/<short-task>` (`feature/…`, `fix/…`, `refactor/…`). Never
   commit on the default/shared branch.
2. **Commit** small and atomic — one logical change per commit, Conventional Commits format
   (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`; append `!` or a
   `BREAKING CHANGE:` footer for a breaking change). No "update" / "fix code" / "done".
3. **Sync** before continuing work: pull the integration branch and merge it into your
   branch (or rebase if the team is comfortable); resolve conflicts by reading BOTH sides,
   then re-run the tests.
4. **PR** — one task per PR, small and described (what · why · how to test · impact). At
   least one review; no self-merge; don't merge on red tests or unresolved comments;
   **squash-merge** to keep history clean.
5. **Release** — merge the integration branch to `main`, tag `vX.Y.Z` (SemVer), then sync
   `main` back to `dev`. (Use the release-check skill for the pre-release gate.)
6. **Hotfix** — branch off `main`, fix, then merge into BOTH `main` and `dev` — otherwise
   the next release re-introduces the bug.

Never force-push or reset a shared branch (`main` / `dev` / `release/*`) — the guard blocks
it anyway. Never commit secrets or `.env` (see the hard rules; the generated `.gitignore`
excludes them).

## Output format (required)
```md
## Branch (from which base)
## Commits (planned, Conventional Commits)
## PR
**Title:** [TASK-xx] <summary>
- **What / Why / How to test / Impact:** …
## Release / tag (if any)
```
