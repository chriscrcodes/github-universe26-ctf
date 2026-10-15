#!/usr/bin/env bash
set -euo pipefail

printf 'Preparing the Universe workshop environment...\n'
printf 'GitHub handle: %s\n' "${GITHUB_USER:-not detected}"
printf 'Scoreboard URL: %s\n' "${BOARD_URL:-not configured}"
if [[ -n "${BOARD_TOKEN:-}" ]]; then
  printf 'Scoreboard token: configured\n'
else
  printf 'Scoreboard token: not configured\n'
fi

command -v squad >/dev/null
command -v copilot >/dev/null
squad --version | grep -Fx "1.0.0" >/dev/null
copilot_version="$(copilot --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | sed -n '1p')"
[[ "$copilot_version" == "1.0.88" ]]

npm ci --no-audit --no-fund

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
  /model mai-code-1.1-flash
5. Use the complete team prompt in .github/steps/1-step.md. It supplies the
  role definitions for seven agents and Purple as a human reviewer. At Roster
  approval, select "❯ Yes, hire this team" to create the Squad state. Do not
  start implementation yet.
6. After the approved roster exists and the health check passes, run all npm
  commands in participant Terminal 1. Start the app with:
  npm run workshop:start
7. Keep using Terminal 1 for npm commands and the same Terminal 2 conversation.
  Follow README.md for the workshop.
EOF
