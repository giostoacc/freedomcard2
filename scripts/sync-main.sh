#!/usr/bin/env bash
set -euo pipefail

TARGET_BRANCH="${1:-main}"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
CURRENT_COMMIT="$(git rev-parse --short HEAD)"

git branch -f "$TARGET_BRANCH" "$CURRENT_BRANCH"

echo "Branch '$TARGET_BRANCH' now points to commit $CURRENT_COMMIT from '$CURRENT_BRANCH'."
echo "Push it upstream with: git push origin $TARGET_BRANCH --force-with-lease"
