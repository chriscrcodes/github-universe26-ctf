## Step 1: Capture the flag with Red

**Hands-on target: minutes 10–17.**

**Objective:** Have Red run the canonical read-only exploit against your local app, review its evidence, and publish the `red` phase.

### 📖 Theory: Evidence before conclusions

The SQL injection is already present in the starting application. Red detects and demonstrates it; Red never adds or edits code. The public hotel search must return only `PUBLIC` listings, and one unpublished listing holds this round's flag. Nothing in the code is labeled vulnerable: runtime evidence, not code reading, tells you which query is unsafe.

### ⌨️ Activity: Capture the flag from runtime evidence

**What to do — Part A: VS Code terminal** (Terminal → New Terminal, at the repository root; not Copilot Chat)

1. Run the scoreboard pre-flight check:

   ```bash
   test -n "${BOARD_URL:-}" && echo "BOARD_URL is set: $BOARD_URL" || echo "BOARD_URL is missing"
   test -n "${BOARD_TOKEN:-}" && echo "BOARD_TOKEN is set (value hidden)" || echo "BOARD_TOKEN is missing"
   curl --fail --silent --show-error "${BOARD_URL%/}/health"
   ```

   ✅ Both lines say `is set` and `curl` prints no error. ❌ Anything else → stop and ask the facilitator. Continue without the scoreboard only if the facilitator confirms offline mode. Never print, paste into chat, or commit `BOARD_TOKEN`.
1. Run `npm run workshop:start`.
   ✅ Output ends with `READY: participant registered.` In confirmed offline mode, a `WARN: BOARD_URL or BOARD_TOKEN is missing` line is expected.
1. Run `squad init --no-workflows`. When asked whether to add the Copilot agent, answer **No**.
1. Run `npm run squad:install-workshop-team`, then `squad doctor`.
   ✅ `squad doctor` reports zero errors. Warnings are acceptable.
1. Run `copilot --yolo --agent squad`, then run `/model` and select **GPT-6 Luna**. All remaining instructions go to Squad in this Copilot CLI session.

**What to do — Part B: Copilot CLI session**

1. Send:

   ```text
   Start the workshop application with npm run workshop:app, confirm that it
   responds on port 3000, and keep it running for our investigation.
   ```

   ✅ Squad reports `Workshop application started in the background` (or `already running`) and a response on port 3000.
1. Open **http://localhost:3000** (Codespaces: **Ports** tab → port 3000 → **Open in Browser**). ✅ The hotel search form loads.
1. Write down a prediction. This is **not a command**: in one or two sentences, state which listings a normal Paris search may show, and which result would prove that boundary was crossed. Describe results, not SQL.
1. Send:

   ```text
   Squad, dispatch Red. Red must first ask me to state my prediction for a
   normal Paris search: which listings it may show, and what result would
   indicate a boundary failure. Wait for my answer. Then run `npm run exploit`
   against the local application using only the canonical read-only workshop
   test. Do not reveal the exploit input, expected counts, flag, or conclusion
   before I answer. Separate observed facts from conclusions. Do not invent
   another payload, target an external system, or edit code.
   ```

1. Give Red your prediction when asked. Red—not you—runs `npm run exploit`.
1. Compare Red's observed facts with your prediction. Then send:

   ```text
   Squad, have Red run `npm run phase -- red` only if `npm run exploit`
   succeeds with all canonical assertions passing. If it fails, do not publish;
   show me the failure. I reviewed the evidence and authorize publication.
   ```

**Expected evidence:**

- `npm run exploit` output contains a `PASS:` line and a `CAPTURED:` line.
- Red's report lists observed facts separately from conclusions.
- `npm run phase -- red` prints `Phase red recorded.` → go to [Step 2](2-step.md).

Mentor's formal check happens after you have reviewed the evidence, in Step 2 — not during your prediction or Red's run.

<details>
<summary>Having trouble? 🤷</summary><br/>

- **App does not respond on port 3000:** ask Squad to read `.workshop-app.log`.
- **`squad: command not found` or `squad init` fails:** confirm the terminal is at the repository root, then ask the facilitator.
- **`npm run squad:install-workshop-team` fails:** rerun it after `squad init --no-workflows`. Do not add workflows manually.
- **`squad doctor` reports an error:** save the output and ask the facilitator before continuing.
- **Squad cannot dispatch Red or says no payload was supplied:** restart with `copilot --yolo --agent squad` and resend the dispatch prompt above.
- **Output differs from your prediction:** record the actual output and ask Red to explain it before publishing.
- **Scoreboard offline:** continue. Squad records every phase locally.
- Never paste credentials or tokens into Copilot.

</details>
