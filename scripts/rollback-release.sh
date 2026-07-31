#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="${APP_ROOT:-/var/www/AstroTools}"
CURRENT_LINK="$APP_ROOT/current"
PREVIOUS_LINK="$APP_ROOT/previous"
SERVICE_NAME="${SERVICE_NAME:-astrotools}"

die() { echo "rollback-release: $*" >&2; exit 1; }

[[ "$(id -u)" == 0 ]] || die "run as root or through sudo -E"
[[ -L "$CURRENT_LINK" ]] || die "current release symlink is missing"
[[ -L "$PREVIOUS_LINK" ]] || die "previous release symlink is missing"

current_target="$(readlink -f "$CURRENT_LINK")"
previous_target="$(readlink -f "$PREVIOUS_LINK")"
[[ -d "$previous_target" ]] || die "previous release directory is missing: $previous_target"

rm -f "$CURRENT_LINK.rollback" "$PREVIOUS_LINK.next" "$CURRENT_LINK.recover"
ln -s "$previous_target" "$CURRENT_LINK.rollback"
mv -Tf "$CURRENT_LINK.rollback" "$CURRENT_LINK"
ln -s "$current_target" "$PREVIOUS_LINK.next"
mv -Tf "$PREVIOUS_LINK.next" "$PREVIOUS_LINK"

systemctl daemon-reload
systemctl restart "$SERVICE_NAME"

for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 3 \
      http://127.0.0.1:3100/api/health/ready >/dev/null; then
    echo "Rolled back to $previous_target."
    exit 0
  fi
  sleep 1
done

echo "Rollback target did not become ready; restoring $current_target." >&2
ln -s "$current_target" "$CURRENT_LINK.recover"
mv -Tf "$CURRENT_LINK.recover" "$CURRENT_LINK"
systemctl restart "$SERVICE_NAME" || true
exit 1
