#!/usr/bin/env bash
#
# Restart the local workshop stack from a clean slate.
#
# Starts the board on :8080 and the hotel app on :3000, then clears every
# trace of the previous run: board teams, the local team identity, and the
# synthetic hotel data. Use it between rehearsals so the board starts empty.
#
#   scripts/restart-workshop.sh              # vulnerable app (workshop default)
#   scripts/restart-workshop.sh --fixed      # fixed app, for the after state
#   scripts/restart-workshop.sh --register   # also register one team
#   scripts/restart-workshop.sh --stop       # stop both servers and exit
#
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

APP_PORT="${APP_PORT:-3000}"
BOARD_PORT="${BOARD_PORT:-8080}"
BOARD_OPERATOR_KEY="${BOARD_OPERATOR_KEY:-workshop}"
BOARD_URL="http://localhost:${BOARD_PORT}"
APP_URL="http://localhost:${APP_PORT}"
LOG_DIR="${TMPDIR:-/tmp}"

if [ -z "${BOARD_TOKEN:-}" ]; then
  echo "BOARD_TOKEN is required for local rehearsal." >&2
  exit 2
fi

vulnerable=1
register=0
stop_only=0

for arg in "$@"; do
  case "$arg" in
    --fixed) vulnerable=0 ;;
    --vulnerable) vulnerable=1 ;;
    --register) register=1 ;;
    --stop) stop_only=1 ;;
    -h|--help) sed -n '3,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

# Free a port by stopping whatever is listening on it. lsof lists one PID per
# line; kill each explicitly so a stale listener cannot survive the restart.
stop_port() {
  local port="$1" label="$2" pids
  pids="$(lsof -ti ":${port}" 2>/dev/null || true)"
  [ -z "$pids" ] && return 0

  while read -r pid; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  done <<< "$pids"

  for _ in $(seq 1 20); do
    lsof -ti ":${port}" >/dev/null 2>&1 || { echo "  stopped ${label} on :${port}"; return 0; }
    sleep 0.25
  done

  while read -r pid; do
    [ -n "$pid" ] && kill -9 "$pid" 2>/dev/null || true
  done <<< "$pids"
  sleep 0.5
  echo "  force-stopped ${label} on :${port}"
}

# Start a long-running service fully detached from this script: its own
# session when setsid is available, so it survives the terminal that launched
# it and never holds the caller's stdout pipe open.
spawn() {
  local log="$1"; shift
  if command -v setsid >/dev/null 2>&1; then
    setsid nohup "$@" > "$log" 2>&1 < /dev/null &
  else
    nohup "$@" > "$log" 2>&1 < /dev/null &
  fi
  disown 2>/dev/null || true
}

wait_for() {
  local url="$1" label="$2"
  for _ in $(seq 1 40); do
    curl -fsS -o /dev/null "$url" 2>/dev/null && return 0
    sleep 0.25
  done
  echo "FAILED: ${label} did not come up at ${url}" >&2
  return 1
}

echo "Stopping any running workshop services..."
stop_port "$APP_PORT" "app"
stop_port "$BOARD_PORT" "board"

if [ "$stop_only" -eq 1 ]; then
  echo "Both services stopped."
  exit 0
fi

# The local team identity points at a team that no longer exists once the board
# restarts, which would make the next `npm run phase` fail with a 409.
rm -f app/.team-state.json

echo "Starting board on :${BOARD_PORT}..."
spawn "${LOG_DIR}/ctf-board.log" \
  env PORT="$BOARD_PORT" BOARD_OPERATOR_KEY="$BOARD_OPERATOR_KEY" BOARD_TOKEN="$BOARD_TOKEN" \
  node board/server/src/server.js
wait_for "${BOARD_URL}/health" "board"

# The Express board keeps state in memory, so a fresh process is already empty.
# Reset anyway: the script must also clean a board that was left running.
curl -fsS -X POST -H "x-operator-key: ${BOARD_OPERATOR_KEY}" \
  "${BOARD_URL}/api/reset" >/dev/null 2>&1 || true

echo "Restoring synthetic hotel data..."
npm run reset --silent >/dev/null 2>&1 || echo "  (data reset skipped)"

if [ "$vulnerable" -eq 1 ]; then
  echo "Starting app on :${APP_PORT} in VULNERABLE mode..."
  (cd app && spawn "${LOG_DIR}/ctf-app.log" env VULNERABLE=1 PORT="$APP_PORT" node src/server.js)
else
  echo "Starting app on :${APP_PORT} in FIXED mode..."
  (cd app && spawn "${LOG_DIR}/ctf-app.log" env VULNERABLE=0 PORT="$APP_PORT" node src/server.js)
fi
wait_for "${APP_URL}/health" "app"

if [ "$register" -eq 1 ]; then
  echo "Registering one team..."
  BOARD_URL="$BOARD_URL" BOARD_TOKEN="$BOARD_TOKEN" ALLOW_LOCAL_BOARD=1 \
    npm run register --silent 2>&1 < /dev/null | tail -1
fi

team_count="$(curl -fsS "${BOARD_URL}/api/state" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).teams.length))')"
app_mode="$(curl -fsS "${APP_URL}/health" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).vulnerable?"VULNERABLE":"fixed"))')"

echo
echo "Board   ${BOARD_URL}   ${team_count} team(s) on the Arcade stage"
echo "App     ${APP_URL}   ${app_mode}"
echo "Logs    ${LOG_DIR}/ctf-board.log, ${LOG_DIR}/ctf-app.log"
echo
echo "Stop both with: scripts/restart-workshop.sh --stop"
