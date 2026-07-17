---
id: python-conventions
scope: paths
enforce: agent-read
paths:
  - "src/**"
  - "**/*.py"
title: Python conventions
---

# Python conventions — one way to do each thing

- **Version:** target Python 3.11+. Use type hints on public functions.
- **Naming:** `snake_case` for functions/variables, `CapWords`/PascalCase for classes, `UPPER_SNAKE` for module constants. (PEP 8)
- **Layout:** `src/<package>/` for code, `tests/` for tests. One package per project unless the Decision Log says otherwise.
- **Formatting & lint:** `ruff` only (format + lint). Do not add black/flake8/isort on top.
- **Tests:** `pytest`. Name tests `test_*.py`; one behavior per test.
- **Dependencies:** one manager (recorded in the Decision Log — e.g. `uv` or `pip`+`requirements.txt`). Never mix two.
- **Errors:** raise specific exceptions; don't swallow with bare `except:`.

Before adding a dependency or a new pattern, check the Decision Log. Don't introduce a second tool for a job that already has one.
