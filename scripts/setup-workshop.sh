#!/usr/bin/env bash
set -euo pipefail

expected_squad_version="0.13.1"

printf 'Preparing the Universe workshop environment...\n'
npm ci --no-audit --no-fund

installed_squad_version=""
if command -v squad >/dev/null 2>&1; then
  installed_squad_version="$(squad --version 2>/dev/null || true)"
fi

if [[ "$installed_squad_version" != "$expected_squad_version" ]]; then
  npm install --global --no-audit --no-fund "@bradygaster/squad-cli@${expected_squad_version}"
fi

squad --version | grep -Fx "$expected_squad_version" >/dev/null

cat <<EOF

Workshop environment ready.
GitHub handle: ${GITHUB_USER:-not detected}
Board URL: ${BOARD_URL:-required from facilitator}

Next:
1. Confirm BOARD_URL, BOARD_TOKEN, and BOARD_TEAM_ID were provisioned.
2. Run npm run workshop:start.
3. Run squad init --no-workflows, npm run squad:install-workshop-team, and squad doctor.
4. Open Copilot CLI, select the local Squad agent, and follow README.md.
EOF
