## Step 1: Capture the flag with Red

**Hands-on target: minutes 10–17.**

**Objective:** Have Red explain the SQL injection, test its canonical payload in the local app, and publish the `red` phase automatically.

**Before you begin:** `npm run workshop:start` keeps progress already saved for this participant. If a phase is already marked complete before you do this step, stop and ask the facilitator for a fresh participant state; restarting the app or running `npm run reset` does not clear phase progress.

### 📖 Theory: Evidence before conclusions

The SQL injection is already present in the starting application. Red detects and demonstrates it; Red never adds or edits code. The public hotel search must return only `PUBLIC` listings, and one unpublished listing holds this round's flag. Nothing in the code is labeled vulnerable: runtime evidence, not code reading, tells you which query is unsafe.

### ⌨️ Activity: Capture the flag from runtime evidence

#### 🖥️ Part A — Initialization in the VS Code terminal

Use the VS Code terminal at the repository root for initialization only. After Squad is installed, start Copilot CLI with the local Squad agent. VS Code Chat does not provide the terminal access this workshop requires.

1. Run the scoreboard pre-flight check:

   Run this pre-flight check in the VS Code terminal.

   ```bash
   test -n "${BOARD_URL:-}" && echo "BOARD_URL is set: $BOARD_URL" || echo "BOARD_URL is missing"
   test -n "${BOARD_TOKEN:-}" && echo "BOARD_TOKEN is set (value hidden)" || echo "BOARD_TOKEN is missing"
   curl --fail --silent --show-error "${BOARD_URL%/}/health"
   ```

   ✅ Both lines say `is set` and `curl` prints no error. ❌ Anything else → stop and ask the facilitator. Continue without the scoreboard only if the facilitator confirms offline mode. Never print, paste into chat, or commit `BOARD_TOKEN`.
1. Run:

   ```bash
   npm run workshop:start
   ```

   ✅ Output ends with `READY: participant registered.` In confirmed offline mode, a `WARN: BOARD_URL or BOARD_TOKEN is missing` line is expected.
1. Run:

   ```bash
   squad init --no-workflows
   ```

   When asked whether to add the Copilot agent, answer **No**.
1. Run:

   ```bash
   npm run squad:install-workshop-team
   squad doctor
   ```

   ✅ `squad doctor` reports zero errors. Warnings are acceptable.

1. Start the workshop session:

   ```bash
   copilot --yolo --agent squad
   ```

   At the Copilot prompt, select the model:

   ```text
   /model gpt-6-luna
   ```

#### 🤖 Part B — Squad in Copilot CLI

1. In the Copilot CLI session, confirm that the local **Squad** agent and `gpt-6-luna` are selected. Keep the participant conversation here for the rest of the exercise; Squad runs commands and delegates to Red, Green, Blue, and Mentor.
1. Ask Squad to start the app by sending:

   ```text
   Squad, start the app and ask Mentor to guide me through the workshop.
   ```

   ✅ Blue runs `npm run workshop:app` and returns the actual browser URL.
   Mentor introduces Harborlight Stays, developed by Blue in this workshop
   scenario, and explains that it searches hotels by city.
1. Open the URL Mentor supplies. No application account or login is needed.
   Mentor asks you to try a **normal Paris search** and describe what you observe.
   Reply in the same Squad conversation; Mentor waits before interpreting results.

1. In the same conversation, ask Red to explain the vulnerability and guide a
   browser test:

   ```text
   Red, explain where the SQL injection is, show me the canonical payload, then
   ask me to test it in the hotel search interface. Do not change the application.
   ```

   Red explains that `app/src/search-query.js`, in `buildCityFilter`, inserts
   the city text into SQL instead of binding it. The quote closes the city
   string, `OR 1=1` makes the filter true, and `--` comments out the remaining
   publication filter. Red must not ask questions or propose a fix.
1. In the browser, replace the city with the supplied payload (the canonical
   payload below)
   and select **Search**:

   ```text
   ' OR 1=1 --
   ```

   The app displays all 24 listings, including 4 unpublished listings. When the
   server confirms the canonical result, it records the evidence and advances
   `red` on the scoreboard automatically. No Red checkpoint, separate command,
   or phase confirmation is needed. Green proposes remediation only after Purple.

**Expected evidence:**

- The browser displays 24 listings, including 4 unpublished listings and the captured flag.
- The search summary says `Red phase recorded on the scoreboard.` → go to [Step 2](2-step.md).
- If the scoreboard is unavailable, the UI says the phase was recorded locally; ask the facilitator to restore the board before continuing.
- If the phase was already complete before this run, do not try to publish it again; stop and ask the facilitator for a fresh participant state.

Mentor's first understanding checkpoint is Purple in Step 2.

<details>
<summary>Having trouble? 🤷</summary><br/>

- **App does not respond on port 3000:** ask Squad to read `.workshop-app.log`.
- **`squad: command not found` or `squad init` fails:** confirm the terminal is at the repository root, then ask the facilitator.
- **`npm run squad:install-workshop-team` fails:** rerun it after `squad init --no-workflows`. Do not add workflows manually.
- **`squad doctor` reports an error:** save the output and ask the facilitator before continuing.
- **Squad cannot dispatch Red:** confirm the local Squad agent is selected in Copilot CLI and ask Mentor to resume the current step.
- **`Phase red is already complete locally`:** participant progress was retained from an earlier run. Ask the facilitator for a fresh participant state before continuing; do not delete state files or use `npm run reset` to try to clear it.
- **Scoreboard offline:** continue. Squad records every phase locally.
- Never paste credentials or tokens into Copilot.

</details>
