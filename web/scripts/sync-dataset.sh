#!/bin/bash
# Copy the packaged dataset into the Next app's static/build locations.
# Run from web/ — invoked by the `prebuild` npm script (and manually when
# the HF dataset is updated).
set -euo pipefail

WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$WEB_DIR/.." && pwd)"
SRC_DIR="$REPO_ROOT/dataset"

if [ ! -f "$SRC_DIR/questions.json" ]; then
  # ../dataset is only present in local checkouts. On Vercel/CI the build
  # sees only `web/`, so fall back to the committed copy under web/data/
  # and web/public/figures/. Fail only if even those are missing.
  if [ -f "$WEB_DIR/data/questions.json" ]; then
    echo "Skipping sync: using committed dataset under web/data/ (Vercel/CI build)" >&2
    exit 0
  fi
  echo "ERR: $SRC_DIR/questions.json not found. Run scripts/pack_dataset.py at the repo root first." >&2
  exit 1
fi

mkdir -p "$WEB_DIR/data" "$WEB_DIR/public/figures"
cp "$SRC_DIR/questions.json" "$WEB_DIR/data/questions.json"
rsync -a --delete "$SRC_DIR/figures/" "$WEB_DIR/public/figures/"

count=$(node -e "console.log(require('./data/questions.json').length)")
figs=$(find "$WEB_DIR/public/figures" -type f | wc -l | tr -d ' ')
echo "synced $count questions, $figs figures"
