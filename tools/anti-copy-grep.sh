#!/usr/bin/env bash
# tools/anti-copy-grep.sh
# Anti-copy CI script — PG-12 arbitré 2026-05-14
# Scan apps/, packages/, migrations/ for forbidden expression patterns.
# Only expression patterns specific to upstream donors are matched —
# universal business nouns (Company, Invoice, Project, Task, ...) are not.
# Exit 1 if any match found, 0 otherwise.

set -euo pipefail

SCAN_DIRS=("apps" "packages" "migrations")
VERBOSE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verbose) VERBOSE=1 ; shift ;;
    -h|--help)
      cat <<EOF
Usage: $0 [--verbose]

Scan apps/, packages/, migrations/ for forbidden expression patterns
from LGPL/AGPL/GPL upstream donors (Odoo, Twenty, Frappe/ERPNext, Kimai,
Dolibarr, SuiteCRM). Exits 1 on first batch of matches.
EOF
      exit 0
      ;;
    *) shift ;;
  esac
done

# --- Pattern banks per donor ---------------------------------------------

# Odoo (LGPLv3) — avoid mimicking schema names, decorator names, ORM API
ODOO_PATTERNS=(
  'mail\.thread'
  'mail\.message'
  'mail\.activity'
  'mail\.tracking'
  'ir\.model\.fields'
  'ir\.rule'
  'ir\.cron'
  'account\.move'
  'account\.move\.line'
  'account\.journal'
  'res\.company'
  'res\.users'
  'res\.partner'
  'res\.lang'
  '\bl10n_ca\b'
  'auth_totp'
  'auth_passkey'
  '@api\.depends'
  '@api\.onchange'
  '_compute_'
  '_inverse_'
)

# Twenty (AGPL) — distinctive TypeScript identifiers
TWENTY_PATTERNS=(
  '\bObjectMetadata\b'
  '\bFieldMetadata\b'
  '\bworkspaceMember\b'
  '\bFavoriteFolder\b'
  '\bRemoteServer\b'
  'useFindManyRecords'
)

# ERPNext / Frappe (GPLv3) — framework idioms
# Note: HTML5 `<!doctype html>` is universal markup, not Frappe-specific. We
# only flag `doctype` in JSON model context (`"doctype":`) or as
# `DocType`-class references.
FRAPPE_PATTERNS=(
  '\bfrappe\.'
  '"doctype"\s*:'
  '\bDocType\b'
  '\bnaming_series\b'
  '\bparenttype\b'
  'frappe\.db\.sql'
  '@frappe\.whitelist'
)

# Kimai (AGPL) — namespaces and event class
KIMAI_PATTERNS=(
  '\bKEvent\b'
  'App\\\\Kimai\\\\'
)

# Dolibarr (GPLv3) — table prefix
DOLIBARR_PATTERNS=(
  '\bllx_'
)

# SuiteCRM (AGPL) — bean access and workflow internals
SUITECRM_PATTERNS=(
  'bean->'
  'Aow_Action'
  'Aow_Processed'
)

ALL_PATTERNS=(
  "${ODOO_PATTERNS[@]}"
  "${TWENTY_PATTERNS[@]}"
  "${FRAPPE_PATTERNS[@]}"
  "${KIMAI_PATTERNS[@]}"
  "${DOLIBARR_PATTERNS[@]}"
  "${SUITECRM_PATTERNS[@]}"
)

# --- Scanner --------------------------------------------------------------

if ! command -v rg >/dev/null 2>&1; then
  echo "ERROR: ripgrep (rg) is required but not installed." >&2
  exit 2
fi

FAIL=0

for dir in "${SCAN_DIRS[@]}"; do
  if [[ ! -d "$dir" ]]; then
    [[ $VERBOSE -eq 1 ]] && echo "Skipping non-existent dir: $dir"
    continue
  fi
  [[ $VERBOSE -eq 1 ]] && echo "Scanning $dir/ ..."
  for pat in "${ALL_PATTERNS[@]}"; do
    if matches=$(rg -n --no-heading "$pat" "$dir" 2>/dev/null); then
      echo "FAIL: forbidden pattern '$pat' found in $dir/:"
      echo "$matches"
      echo
      FAIL=1
    fi
  done
done

if [[ $FAIL -eq 1 ]]; then
  echo "Anti-copy violations detected. Review against docs/study/03-shortlist/shortlist.md and docs/study/08-anti-copy/."
  exit 1
fi

echo "OK: no anti-copy violations detected."
exit 0
