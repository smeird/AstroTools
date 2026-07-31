#!/usr/bin/env bash
set -Eeuo pipefail

LOCAL_BASE_URL="${LOCAL_BASE_URL:-http://127.0.0.1:3100}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://astrotools.smeird.com}"

check_json() {
  local url="$1"
  echo "Checking $url"
  curl --fail --silent --show-error --max-time 10 "$url" \
    | grep -Eq '"status":"(ok|ready)"'
}

check_json "$LOCAL_BASE_URL/api/health/live"
check_json "$LOCAL_BASE_URL/api/health/ready"
check_json "$PUBLIC_BASE_URL/api/health/live"
check_json "$PUBLIC_BASE_URL/api/health/ready"

headers="$(curl --fail --silent --show-error --max-time 10 -D - -o /dev/null "$PUBLIC_BASE_URL/")"
for header in \
  'strict-transport-security:' \
  'x-content-type-options: nosniff' \
  'x-frame-options: SAMEORIGIN' \
  'content-security-policy:'; do
  grep -Eiq "^${header}" <<<"$headers" || {
    echo "Missing expected response header: $header" >&2
    exit 1
  }
done

echo "Astrotools smoke test passed."
