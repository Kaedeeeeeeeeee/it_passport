#!/bin/bash
# Copy the packaged dataset into the Next app's static/build locations.
# Run from web/ — invoked by the `prebuild` npm script (and manually when
# the HF dataset is updated).
set -euo pipefail

WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$WEB_DIR/.." && pwd)"
SRC_DIR="$REPO_ROOT/dataset"

if [ ! -f "$SRC_DIR/questions.json" ]; then
  echo "ERR: $SRC_DIR/questions.json not found. Run scripts/pack_dataset.py at the repo root first." >&2
  exit 1
fi

mkdir -p "$WEB_DIR/data" "$WEB_DIR/public/figures"
cp "$SRC_DIR/questions.json" "$WEB_DIR/data/questions.json"
rsync -a --delete "$SRC_DIR/figures/" "$WEB_DIR/public/figures/"

count=$(node -e "console.log(require('./data/questions.json').length)")
figs=$(find "$WEB_DIR/public/figures" -type f | wc -l | tr -d ' ')
echo "synced $count questions, $figs figures"
