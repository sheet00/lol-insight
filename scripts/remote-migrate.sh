#!/usr/bin/env bash
set -euo pipefail

# D1 本番環境にマイグレーションを適用するユーティリティ
# 使い方:
#   scripts/remote-migrate.sh [DB_NAME]
# 引数省略時は src/wrangler.jsonc の d1_databases[0].database_name を使用

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT_DIR/src"
WRANGLER_CONFIG="$SRC_DIR/wrangler.jsonc"

WRANGLER_CMD="wrangler"
if ! command -v wrangler >/dev/null 2>&1; then
  if command -v npx >/dev/null 2>&1; then
    WRANGLER_CMD="npx -y wrangler"
  else
    echo "wrangler コマンドが見つからないよ。'npm i -g wrangler' か 'npm i -D wrangler' を入れてね" >&2
    exit 1
  fi
fi

if [[ ! -f "$WRANGLER_CONFIG" ]]; then
  echo "設定ファイルが見つからない: $WRANGLER_CONFIG" >&2
  exit 1
fi

# DB 名の決定（引数優先）。JSONCでも動くように sed で抽出
DB_NAME="${1-}"
if [[ -z "$DB_NAME" ]]; then
  DB_NAME="$(sed -n 's/.*"database_name"\s*:\s*"\([^"]*\)".*/\1/p' "$WRANGLER_CONFIG" | head -n1)"
fi

if [[ -z "$DB_NAME" ]]; then
  echo "D1 の database_name が取得できなかったよ。引数で DB 名を渡してね。" >&2
  echo "例: scripts/remote-migrate.sh lol-teacher-db" >&2
  exit 1
fi

echo "ターゲット D1（本番）: $DB_NAME"
echo "マイグレーションディレクトリ: $SRC_DIR/migrations"

if [[ ! -d "$SRC_DIR/migrations" ]]; then
  echo "マイグレーションフォルダが無いよ: $SRC_DIR/migrations" >&2
  echo "先に 'npm run db:generate' などで生成してね" >&2
  exit 1
fi

read -r -p "本当に Cloudflare のリモート D1 に適用する？ (y/N): " ans
ans=${ans:-N}
if [[ ! "$ans" =~ ^[yY]$ ]]; then
  echo "キャンセルしたよ。"
  exit 0
fi

cd "$SRC_DIR"
echo "$WRANGLER_CMD d1 migrations apply $DB_NAME を実行するね…"
$WRANGLER_CMD d1 migrations apply "$DB_NAME"

echo "✅ 本番 D1 にマイグレーション適用が完了！"
