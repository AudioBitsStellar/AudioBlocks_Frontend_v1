#!/usr/bin/env bash
# Rolls back production to a previously-published image by re-pointing the
# `production` tag at an existing `sha-<commit>` tag's manifest — no
# rebuild (#844). See docs/ROLLBACK.md.
#
# Usage: ./scripts/rollback.sh <good-commit-sha> [registry/image]
set -euo pipefail

GOOD_SHA="${1:?Usage: $0 <good-commit-sha> [registry/image]}"
IMAGE="${2:-ghcr.io/audiobitsstellar/audioblocks_frontend_v1}"
SOURCE_TAG="${IMAGE}:sha-${GOOD_SHA}"
TARGET_TAG="${IMAGE}:production"

echo "Rolling back ${TARGET_TAG} -> ${SOURCE_TAG}"

docker buildx imagetools inspect "${SOURCE_TAG}" >/dev/null || {
  echo "error: ${SOURCE_TAG} does not exist in the registry — check the SHA" >&2
  exit 1
}

docker buildx imagetools create --tag "${TARGET_TAG}" "${SOURCE_TAG}"

echo "Done. ${TARGET_TAG} now points at the same image as ${SOURCE_TAG}."
echo "Next: redeploy ${TARGET_TAG} on the production host, then verify GET /api/health."
