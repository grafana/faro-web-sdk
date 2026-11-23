#!/usr/bin/env bash
# The vectors under src/__vectors__ are byte-identical copies of grafana/faro spec/sampling/*.json.
# This checks them against the given ref (default: main) and fails on any difference.
set -euo pipefail
REF="${1:-main}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/src/__vectors__"
BASE="https://raw.githubusercontent.com/grafana/faro/${REF}/spec/sampling"
status=0
for f in keys.json rolls.json rules-hash.json; do
  if curl -fsSL "${BASE}/${f}" | cmp -s - "${DIR}/${f}"; then
    echo "same    ${f}"
  else
    echo "DIFFERS ${f} (grafana/faro@${REF})"
    status=1
  fi
done
exit $status
