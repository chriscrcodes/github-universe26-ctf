#!/usr/bin/env bash
set -euo pipefail

expected_squad_version="1.0.0"
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
  If asked whether to add @copilot as an autonomous team member, answer No.
2. In participant Terminal 1, run the health check:
  squad doctor
3. Open participant Terminal 2 and start Squad:
  copilot --agent squad --yolo
4. In Copilot, select the model:
  /model gpt-6-luna
5. Ask Squad to create the three workshop roles and include its default
  built-in support agents. Do not add @copilot or other workshop specialists.
  At Roster approval, select "❯ Yes, hire this team". If asked which language
  the app uses, answer "node app". Do not start implementation yet.
6. After the approved roster exists and the health check passes, run all npm
  commands in participant Terminal 1. Start the app with:
  npm run workshop:start
7. Keep using Terminal 1 for npm commands and the same Terminal 2 conversation.
  Follow README.md for the workshop.
EOF
