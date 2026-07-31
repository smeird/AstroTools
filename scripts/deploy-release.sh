#!/usr/bin/env bash
set -Eeuo pipefail

# Build and activate an immutable release from the current, reviewed Git
# checkout. Run as root from the repository checkout on the production host.

APP_ROOT="${APP_ROOT:-/var/www/AstroTools}"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
PREVIOUS_LINK="$APP_ROOT/previous"
RUNTIME_ENV="${RUNTIME_ENV:-/etc/astrotools/astrotools.env}"
MIGRATION_ENV="${MIGRATION_ENV:-/etc/astrotools/astrotools-migration.env}"
SERVICE_NAME="${SERVICE_NAME:-astrotools}"
NODE_BIN="${NODE_BIN:-/usr/local/bin/node}"
NPM_BIN="${NPM_BIN:-/usr/local/bin/npm}"
BACKUP_BEFORE_MIGRATION="${BACKUP_BEFORE_MIGRATION:-0}"

die() { echo "deploy-release: $*" >&2; exit 1; }

[[ "$(id -u)" == 0 ]] || die "run as root or through sudo -E"
[[ -d .git ]] || die "run from the Git checkout root"
[[ -f "$RUNTIME_ENV" ]] || die "missing runtime environment: $RUNTIME_ENV"
[[ -f "$MIGRATION_ENV" ]] || die "missing migration environment: $MIGRATION_ENV"
[[ -x "$NODE_BIN" ]] || NODE_BIN="$(command -v node || true)"
[[ -x "$NPM_BIN" ]] || NPM_BIN="$(command -v npm || true)"
[[ -n "$NODE_BIN" && -x "$NODE_BIN" ]] || die "Node.js 24 executable not found"
[[ -n "$NPM_BIN" && -x "$NPM_BIN" ]] || die "npm executable not found"

git diff --quiet || die "working tree has tracked changes; deploy a reviewed commit"
git diff --cached --quiet || die "staged changes are present; deploy a reviewed commit"

commit="$(git rev-parse --short=12 HEAD)"
release_id="$(date -u +%Y%m%d%H%M%S)-$commit"
release_dir="$RELEASES_DIR/$release_id"
staging_dir="$RELEASES_DIR/.staging-$release_id"

mkdir -p "$RELEASES_DIR"
rm -rf "$staging_dir"
mkdir "$staging_dir"
trap 'rm -rf "$staging_dir"' EXIT

echo "Creating release $release_id from $(git rev-parse HEAD)"
git archive HEAD | tar -x -C "$staging_dir"

cd "$staging_dir"
set -a
# The migration identity is intentionally present only in this short-lived
# release process. systemd receives only the runtime environment file.
source "$RUNTIME_ENV"
source "$MIGRATION_ENV"
set +a

if [[ "$BACKUP_BEFORE_MIGRATION" == 1 ]]; then
  "$staging_dir/ops/mysql/backup.sh"
fi

# Prisma migrations, the seed entry point, and the Next.js build use pinned
# development tools (Prisma CLI and tsx). Install them explicitly even when
# the invoking shell exports NODE_ENV=production or npm_config_omit=dev.
"$NPM_BIN" ci --include=dev
"$NPM_BIN" run db:migrate:deploy
"$NPM_BIN" run db:seed
"$NPM_BIN" run build
# The standalone server has its production dependencies under .next/standalone;
# do not carry test and build tooling into the immutable runtime release.
"$NPM_BIN" prune --omit=dev
unset MIGRATION_DATABASE_URL

install -d -o astrotools -g astrotools -m 0755 "$release_dir"
cp -a "$staging_dir/." "$release_dir/"
chown -R astrotools:astrotools "$release_dir"
chmod -R u=rwX,g=rX,o=rX "$release_dir"

old_target=""
if [[ -L "$CURRENT_LINK" ]]; then
  old_target="$(readlink -f "$CURRENT_LINK")"
fi
rm -f "$CURRENT_LINK.next" "$PREVIOUS_LINK.next" "$CURRENT_LINK.rollback"
ln -s "$release_dir" "$CURRENT_LINK.next"
mv -Tf "$CURRENT_LINK.next" "$CURRENT_LINK"
if [[ -n "$old_target" && -d "$old_target" ]]; then
  ln -s "$old_target" "$PREVIOUS_LINK.next"
  mv -Tf "$PREVIOUS_LINK.next" "$PREVIOUS_LINK"
fi

systemctl daemon-reload
systemctl restart "$SERVICE_NAME"

for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 3 \
      http://127.0.0.1:3100/api/health/ready >/dev/null; then
    echo "Release $release_id is ready."
    exit 0
  fi
  sleep 1
done

echo "Release did not become ready; restoring the previous symlink." >&2
if [[ -n "$old_target" && -d "$old_target" ]]; then
  ln -s "$old_target" "$CURRENT_LINK.rollback"
  mv -Tf "$CURRENT_LINK.rollback" "$CURRENT_LINK"
  systemctl restart "$SERVICE_NAME" || true
fi
exit 1
