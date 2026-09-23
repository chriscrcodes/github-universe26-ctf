## Step 1: Red captures the flag

**Hands-on target: minutes 10–17.** You are the decision-maker. Red supplies
runtime evidence; you predict first and distinguish facts from conclusions.
The SQL injection is already present in the starting application. Red does not
add or modify vulnerable code; Red only detects and demonstrates the existing
behavior with the supplied read-only request.

### 🚀 Start the exercise

1. Open this repository in VS Code, then open **Terminal → New Terminal**.
   Make sure the terminal is at the repository root. Do not type these setup
   commands in GitHub Copilot Chat.
1. Before registering, confirm with your facilitator that the shared scoreboard
   was provisioned for this workshop. When it is enabled, check that `BOARD_URL`
   points to the facilitator's board, `BOARD_TOKEN` is set, and the board
   responds at its health endpoint:

   ```bash
   test -n "${BOARD_URL:-}" && echo "BOARD_URL is set: $BOARD_URL" || echo "BOARD_URL is missing"
   test -n "${BOARD_TOKEN:-}" && echo "BOARD_TOKEN is set (value hidden)" || echo "BOARD_TOKEN is missing"
   curl --fail --silent --show-error "${BOARD_URL%/}/health"
   ```

   Never print, paste into chat, or commit `BOARD_TOKEN`. If a value is missing
   or the health check fails, stop and ask the facilitator before continuing.
   If the facilitator explicitly confirms offline mode, the exercise can still
   run locally without the scoreboard.
1. After the pre-flight check, validate the environment and register:

   ```bash
   npm run workshop:start
   ```

   If offline mode was confirmed, the registration warning is expected.
1. Initialize Squad without adding workflows:

   ```bash
   squad init --no-workflows
   ```

   Keep this command interactive. When Squad asks whether to add the Copilot
   agent, answer **No**; the workshop team is installed in the next command.
   Then run:

   ```bash
   npm run squad:install-workshop-team
   squad doctor
   ```

   Continue only if `squad doctor` reports no errors. Warnings are normal; ask
   the facilitator if you are unsure whether a warning is expected.
1. Start Copilot CLI with the local Squad agent:

   ```bash
   copilot --yolo --agent squad
   ```

   In Copilot CLI, confirm the selected model is **GPT-6 Luna** (use `/model`
   to check or select it). From here on, give instructions to Squad in this
   Copilot CLI session. The setup commands above are typed in the VS Code
   terminal, not in Copilot Chat.

### 📖 Theory: Evidence before conclusions

A useful security result distinguishes expected behavior, observed behavior, and
the conclusion supported by the difference. The public hotel search must return
only published inventory. Unpublished listings carry an internal reference, and
one of those references is the flag for this round.

Nothing in the code is labelled as vulnerable. Several queries in the same
files are already parameterized, and the search input is passed through a
normalization helper. Evidence, not reading speed, is what tells you which
query is unsafe.

### ⌨️ Activity: Capture the flag from runtime evidence

You should now be in the Copilot CLI session with the local **Squad** agent.

1. Ask Squad to start the local application in the background:

   ```text
   Start the workshop application with npm run workshop:app, confirm that it
   responds on port 3000, and keep it running for our investigation.
   ```

1. Open the application in a web browser at **http://localhost:3000** (in
   Codespaces, use the forwarded port's **Open in Browser** link). Take a moment
   to see the hotel search interface before investigating it.
1. Before Red runs anything, make a short prediction in your own words. This is
   **not a command**: decide which listings a normal Paris search should be
   allowed to show, and what result would make you suspect that boundary was
   crossed.
   Focus on what appears in the results, not on SQL or how to run the test.
1. Then ask Squad to dispatch Red:

   ```text
   Squad, dispatch Red. Red must first ask me to state my prediction for a
   normal Paris search: which listings it may show, and what result would
   indicate a boundary failure. Wait for my answer. Then run `npm run exploit`
   against the local application using only the canonical read-only workshop
   test. Do not reveal the exploit input, expected counts, flag, or conclusion
   before I answer. Separate observed facts from conclusions. Do not invent
   another payload, target an external system, or edit code.
   ```

1. Red—not you—runs `npm run exploit`. Review its evidence, then ask Squad to
   have Red publish the `red` phase only after every assertion in the canonical
   exploit passes:

   ```text
   Squad, have Red run `npm run phase -- red` only if `npm run exploit`
   succeeds with all canonical assertions passing. If it fails, do not publish;
   show me the failure. I reviewed the evidence and authorize publication.
   ```

   You do not need to type the npm commands yourself.
1. Continue to [Step 2](2-step.md) once the `red` phase is published. Green
   will explain the source, flow, and sink; then Mentor will ask the
   understanding-check questions one at a time without revealing the expected
   answers. Mentor's formal check happens after you have reviewed the evidence,
   not during Red's prediction or investigation.

<details>
<summary>Having trouble? 🤷</summary><br/>

- Ask Squad to inspect `.workshop-app.log` if the background application does
  not respond.
- If `squad init` is unavailable, confirm that the terminal is at the repository
  root and ask the facilitator for help.
- If `npm run squad:install-workshop-team` fails, rerun it after
  `squad init --no-workflows`; do not add workflows manually.
- If `squad doctor` reports an error, save the diagnostic output and ask the
  facilitator before continuing. Warnings alone are normal.
- Red must use only the canonical local workshop evidence; do not paste
  credentials or tokens into Copilot.
- If Squad says that no payload was supplied or that it cannot dispatch Red,
  confirm that you started Copilot CLI with `--agent squad` and used the prompt
  above.
- If the output differs, record the actual output and ask Red to explain it
  before moving on.
- If the scoreboard is offline, keep going: Squad records every phase locally.

</details>
