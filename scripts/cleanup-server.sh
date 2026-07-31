#!/usr/bin/env bash
set -Eeuo pipefail

# Remove disposable Astrotools release directories and generated checkout
# caches. The default mode is report-only. Deletion requires --apply.

APP_ROOT="${APP_ROOT:-/var/www/AstroTools}"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
PREVIOUS_LINK="$APP_ROOT/previous"
KEEP_RELEASES="${KEEP_RELEASES:-2}"
STAGING_MAX_AGE_DAYS="${STAGING_MAX_AGE_DAYS:-7}"
APPLY=0
CLEAN_CHECKOUT_CACHES=0

die() {
  echo "cleanup-server: $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: sudo scripts/cleanup-server.sh [options]

Report disposable files by default. Nothing is deleted without --apply.

Options:
  --apply                    Delete the reported candidates.
  --keep-releases N          Keep the newest N release directories (default: 2).
  --staging-older-than N     Remove staging directories older than N days (default: 7).
  --clean-checkout-caches    Also remove generated caches from the repository checkout.
  -h, --help                 Show this help.

Environment overrides:
  APP_ROOT, KEEP_RELEASES, STAGING_MAX_AGE_DAYS
EOF
}

while (($# > 0)); do
  case "$1" in
    --apply)
      APPLY=1
      shift
      ;;
    --keep-releases)
      (($# >= 2)) || die "--keep-releases requires a number"
      KEEP_RELEASES="$2"
      shift 2
      ;;
    --staging-older-than)
      (($# >= 2)) || die "--staging-older-than requires a number"
      STAGING_MAX_AGE_DAYS="$2"
      shift 2
      ;;
    --clean-checkout-caches)
      CLEAN_CHECKOUT_CACHES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown option: $1"
      ;;
  esac
done

[[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]] || die "KEEP_RELEASES must be a non-negative integer"
[[ "$STAGING_MAX_AGE_DAYS" =~ ^[0-9]+$ ]] || die "STAGING_MAX_AGE_DAYS must be a non-negative integer"
[[ -d "$APP_ROOT" ]] || die "application root does not exist: $APP_ROOT"

APP_ROOT_REAL="$(realpath -e -- "$APP_ROOT")"
RELEASES_DIR_REAL="$(realpath -m -- "$RELEASES_DIR")"
[[ "$RELEASES_DIR_REAL" == "$APP_ROOT_REAL/releases" ]] ||
  die "refusing an releases directory outside APP_ROOT: $RELEASES_DIR_REAL"

if [[ -e "$CURRENT_LINK" ]]; then
  CURRENT_TARGET="$(readlink -f -- "$CURRENT_LINK" || true)"
else
  CURRENT_TARGET=""
fi
if [[ -e "$PREVIOUS_LINK" ]]; then
  PREVIOUS_TARGET="$(readlink -f -- "$PREVIOUS_LINK" || true)"
else
  PREVIOUS_TARGET=""
fi

if [[ "$CLEAN_CHECKOUT_CACHES" == 1 ]]; then
  [[ -L "$CURRENT_LINK" ]] ||
    die "--clean-checkout-caches requires an atomic current release symlink"
  [[ "$CURRENT_TARGET" == "$RELEASES_DIR_REAL/"* ]] ||
    die "refusing to clean checkout caches while current is outside releases"
fi

if [[ "$APPLY" == 1 ]]; then
  echo "Applying cleanup under $APP_ROOT"
else
  echo "Dry run only; pass --apply after reviewing the candidates."
fi

show_candidate() {
  local path="$1"
  local size
  size="$(du -sh -- "$path" 2>/dev/null | awk '{print $1}')"
  if [[ "$APPLY" == 1 ]]; then
    rm -rf -- "$path"
    echo "Removed $size $path"
  else
    echo "Would remove $size $path"
  fi
}

release_count=0
if [[ -d "$RELEASES_DIR" ]]; then
  while IFS= read -r release_name; do
    [[ -n "$release_name" ]] || continue
    release_path="$RELEASES_DIR/$release_name"
    release_real="$(realpath -e -- "$release_path")"
    if [[ "$release_real" == "$CURRENT_TARGET" || "$release_real" == "$PREVIOUS_TARGET" ]]; then
      echo "Keeping protected release $release_path"
      continue
    fi
    if ((release_count < KEEP_RELEASES)); then
      echo "Keeping recent release $release_path"
      ((release_count += 1))
      continue
    fi
    show_candidate "$release_path"
  done < <(
    find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d \
      -name '20????????????-*' -printf '%f\n' | sort -r
  )

  while IFS= read -r staging_path; do
    [[ -n "$staging_path" ]] || continue
    show_candidate "$staging_path"
  done < <(
    find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d \
      -name '.staging-*' -mtime "+$STAGING_MAX_AGE_DAYS" -print
  )
else
  echo "No releases directory found at $RELEASES_DIR"
fi

if [[ "$CLEAN_CHECKOUT_CACHES" == 1 ]]; then
  for cache_path in \
    "$APP_ROOT/.next" \
    "$APP_ROOT/test-results" \
    "$APP_ROOT/coverage" \
    "$APP_ROOT/playwright-report" \
    "$APP_ROOT/.turbo" \
    "$APP_ROOT/tsconfig.tsbuildinfo"; do
    [[ -e "$cache_path" ]] || continue
    show_candidate "$cache_path"
  done
fi

echo "Current release: ${CURRENT_TARGET:-not configured}"
echo "Previous release: ${PREVIOUS_TARGET:-not configured}"
