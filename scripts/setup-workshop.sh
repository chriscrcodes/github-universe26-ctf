#!/usr/bin/env bash
set -euo pipefail

expected_squad_version="0.13.1"
expected_copilot_version="1.0.88"

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

installed_copilot_version=""
if command -v copilot >/dev/null 2>&1; then
  installed_copilot_version="$(copilot --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n 1 || true)"
fi

if [[ "$installed_copilot_version" != "$expected_copilot_version" ]]; then
  npm install --global --no-audit --no-fund "@github/copilot@${expected_copilot_version}"
fi

command -v copilot >/dev/null

cat <<EOF

Workshop environment ready.
GitHub handle: ${GITHUB_USER:-not detected}
Scoreboard: ${BOARD_URL:-offline (the capture-the-flag run still works)}

Next:
1. In participant Terminal 1, initialize Squad:
  squad init --no-workflows
2. In .squad/config.json, set defaultModel to gpt-6-luna.
3. In participant Terminal 1, start Squad:
  copilot --agent squad --yolo
4. Ask Squad to present the three workshop roles and four default support agents.
  Approve the roster and let Squad create it before continuing.
5. Open participant Terminal 2 and run the manual health check:
  squad doctor
6. After the check passes, start the app in participant Terminal 2:
  npm run workshop:start
7. Follow README.md and the same Squad conversation for the workshop.
EOF
