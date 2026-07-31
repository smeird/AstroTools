#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/astrotools}"
MYSQL_CNF="${MYSQL_CNF:-/etc/astrotools/mysql-backup.cnf}"
GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT:-}"
METRICS_FILE="${BACKUP_METRICS_FILE:-/var/lib/node_exporter/textfile_collector/astrotools_backup.prom}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

die() { echo "backup: $*" >&2; exit 1; }
command -v mysqldump >/dev/null || die "mysqldump is not installed"
command -v gpg >/dev/null || die "gpg is not installed"
[[ "$(id -u)" == 0 ]] || die "run as root or through sudo"
[[ -f "$MYSQL_CNF" ]] || die "missing protected MySQL client file: $MYSQL_CNF"
[[ "$(stat -c '%a' "$MYSQL_CNF")" == 600 ]] || die "$MYSQL_CNF must have mode 0600"
[[ -n "$GPG_RECIPIENT" ]] || die "set BACKUP_GPG_RECIPIENT to an encryption key"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$BACKUP_DIR/astrotools-$timestamp.sql.gz.gpg"
temporary="$(mktemp "$BACKUP_DIR/.astrotools-$timestamp.XXXXXX")"
trap 'rm -f "$temporary"' EXIT

mysqldump \
  --defaults-extra-file="$MYSQL_CNF" \
  --single-transaction \
  --routines \
  --events \
  --triggers \
  --hex-blob \
  --set-gtid-purged=OFF \
  | gzip -9 \
  | gpg --batch --yes --trust-model always --recipient "$GPG_RECIPIENT" \
      --output "$temporary" --encrypt

mv -f "$temporary" "$output"
chmod 600 "$output"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'astrotools-*.sql.gz.gpg' \
  -mtime "+$RETENTION_DAYS" -delete

if [[ -d "$(dirname "$METRICS_FILE")" ]]; then
  temporary_metrics="$(mktemp "${METRICS_FILE}.XXXXXX")"
  printf 'astrotools_backup_last_success_timestamp_seconds %s\n' "$(date +%s)" \
    > "$temporary_metrics"
  chmod 644 "$temporary_metrics"
  mv -f "$temporary_metrics" "$METRICS_FILE"
fi

echo "Encrypted backup written to $output"
