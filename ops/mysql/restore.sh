#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_FILE="${1:-}"
MYSQL_CNF="${MYSQL_CNF:-/etc/astrotools/mysql-restore.cnf}"
CONFIRM_RESTORE="${CONFIRM_RESTORE:-}"

die() { echo "restore: $*" >&2; exit 1; }
[[ "$(id -u)" == 0 ]] || die "run as root or through sudo"
[[ -n "$BACKUP_FILE" ]] || die "usage: CONFIRM_RESTORE=YES $0 /path/to/backup.sql.gz.gpg"
[[ "$CONFIRM_RESTORE" == YES ]] || die "set CONFIRM_RESTORE=YES explicitly"
[[ -f "$BACKUP_FILE" ]] || die "backup file not found: $BACKUP_FILE"
[[ -f "$MYSQL_CNF" ]] || die "missing protected MySQL restore file: $MYSQL_CNF"
[[ "$(stat -c '%a' "$MYSQL_CNF")" == 600 ]] || die "$MYSQL_CNF must have mode 0600"
command -v gpg >/dev/null || die "gpg is not installed"

temporary="$(mktemp --suffix=.sql.gz)"
trap 'rm -f "$temporary"' EXIT
gpg --batch --decrypt --output "$temporary" "$BACKUP_FILE"
gzip -dc "$temporary" | mysql --defaults-extra-file="$MYSQL_CNF"
echo "Restore completed. Run the documented readiness and catalogue smoke tests."
