---
id: go-conventions
scope: paths
enforce: agent-read
paths:
  - "**/*.go"
title: Go conventions
---

# Go conventions — idiomatic, one way to do each thing

- **Formatting:** `gofmt`/`go vet` clean. Never hand-format.
- **Naming:** `MixedCaps`/`mixedCaps`, never underscores; exported = Capitalized first letter, unexported = lowercase. No `Get` prefix on getters (`Owner()`, not `GetOwner()`). One-method interfaces take the `-er` suffix (`Reader`). (Effective Go)
- **Layout:** `cmd/<app>/` for entrypoints, `internal/` for private packages, package-per-directory.
- **Errors:** return `error`; wrap with `fmt.Errorf("...: %w", err)`; don't panic in library code.
- **Concurrency:** pass `context.Context` as the first arg to blocking calls; don't leak goroutines.
- **Tests:** table-driven, `TestXxx(t *testing.T)`, in `_test.go` next to the code.
- **Dependencies:** standard library first; add a module only when it earns its place (record it in the Decision Log).

Before adding a dependency or a new pattern, check the Decision Log. Don't introduce a second way to do something that already has one.
