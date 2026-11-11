#!/usr/bin/env bash
# Miss Marilyn HQ session setup: runs on every session start (.claude/settings.json), so it is
# quick when nothing is missing and never fails the session. It installs the Node dependencies
# and PyMuPDF (KDP preflight), and reports which keys this session has, by name only.
QUIET=0; [ "${1:-}" = "--quiet" ] && QUIET=1
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT" || exit 0

if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci --no-audit --no-fund --silent >/dev/null 2>&1 || echo "[setup] npm ci failed: run it by hand" >&2
fi
PY="${PYTHON:-python3}"
if command -v "$PY" >/dev/null 2>&1 && ! "$PY" -c "import pymupdf" >/dev/null 2>&1; then
  "$PY" -m pip install -q -r apps/backend/preflight/requirements.txt >/dev/null 2>&1 || echo "[setup] couldn't install PyMuPDF: KDP preflight won't run here" >&2
fi

if [ $QUIET -eq 0 ]; then
  for k in GOOGLE_SERVICE_ACCOUNT_JSON MM_CORE_SHEET_ID GOOGLE_OWNER_REFRESH_TOKEN AUTH_GOOGLE_ID AUTH_GOOGLE_SECRET FAL_KEY ANTHROPIC_API_KEY; do
    if [ -n "${!k:-}" ] || grep -qs "^$k=.\+" .env; then echo "[setup] $k: set"; else echo "[setup] $k: missing"; fi
  done
  echo "[setup] npm run doctor checks every connection"
fi
exit 0
