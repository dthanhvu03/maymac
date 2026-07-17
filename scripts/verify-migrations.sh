#!/usr/bin/env bash
# Verify migration goose mà không cần cài Go: trích block SQL từ mỗi file rồi
# apply bằng psql BÊN TRONG container Postgres. Chứng minh schema chạy trên DB rỗng
# và rollback được. Yêu cầu: một container Postgres đang chạy (mặc định: maymac-pg).
set -euo pipefail

CONTAINER="${PG_CONTAINER:-maymac-pg}"
DB="${PG_DB:-maymac}"
USER="${PG_USER:-postgres}"
MIG_DIR="${MIGRATIONS_DIR:-db/migrations}"

psql() { docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 -q "$@"; }

# In phần SQL của một section goose ("Up" hoặc "Down") trong 1 file, bỏ dòng annotation.
section() { # $1=file $2=Up|Down
  awk -v want="$2" '
    /^-- \+goose (Up|Down)/ { cur=$3; next }
    /^-- \+goose (StatementBegin|StatementEnd)/ { next }
    cur==want { print }
  ' "$1"
}

files=$(ls "$MIG_DIR"/*.sql | sort)

echo "== APPLY UP (thứ tự xuôi) =="
for f in $files; do
  echo "  -> $(basename "$f")"
  section "$f" Up | psql
done

echo "== KIỂM TRA =="
echo -n "  Số bảng (public): "
psql -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
echo -n "  Số enum type:     "
psql -tAc "SELECT count(*) FROM pg_type WHERE typtype='e';"
echo -n "  View current_capability_availability: "
psql -tAc "SELECT count(*) FROM information_schema.views WHERE table_name='current_capability_availability';"
echo -n "  Trigger set_updated_at đang gắn: "
psql -tAc "SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal;"

if [ "${1:-roundtrip}" = "roundtrip" ]; then
  echo "== APPLY DOWN (thứ tự ngược) — test rollback =="
  for f in $(echo "$files" | sort -r); do
    echo "  <- $(basename "$f")"
    section "$f" Down | psql
  done
  echo -n "  Số bảng còn lại sau rollback: "
  psql -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
  echo -n "  Số enum còn lại sau rollback: "
  psql -tAc "SELECT count(*) FROM pg_type WHERE typtype='e';"
fi

echo "== DONE =="
