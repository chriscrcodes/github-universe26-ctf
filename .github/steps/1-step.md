---
title: Discover Squad and Deliver the Synthetic Challenge
description: "Create your Squad team, integrate the supplied prototype, and verify ordinary city searches."
---

## Step 1: Recruit your team and deliver search

Target: minutes 0-10. Recruit during minutes 0-3, implement during 3-8,
then verify ordinary city searches and authorize delivery during 8-10.

### 📖 Theory: Separate responsibilities

Squad keeps a team's roles, decisions, and context in `.squad/`. Blue develops,
Red reviews security, and Green advises on corrections. You decide who works
next. Blue integrates the supplied training prototype. You will inspect its
behavior later. Use only fictitious hotel records and localhost or a privately
forwarded Codespaces port; never use real data.

Think of Squad as your coordinator, not an unattended pipeline. You give one
task, inspect its result, then choose the next task. Separate roles make it
easier to ask who implemented a change, who reviewed it, and who proposed the
correction. They do not remove your responsibility for any of those decisions.

The app begins with city search unavailable. Integrating the prototype changes
real application behavior; reading the prototype alone does not deliver the
feature. Start by checking ordinary city searches and recording how many
listings each search returns. The challenge-specific investigation comes later.

![Paris search before city search is implemented, showing the app's not-available-yet message.](../images/sqli-demo/0-search-not-implemented.png)

*🧱 At this point, the app is running, but city search has not been delivered.*

### ⌨️ Activity: Recruit, then deliver

1. In Terminal 1, opened at the participant repository root, initialize Squad.
   If prompted `Add @copilot as an autonomous team member? [Y/n]`, answer `No`.

   ```bash
   squad init --no-workflows
   ```

1. Still in Terminal 1, run the health check yourself and resolve any reported
   issue before continuing.

   ```bash
   squad doctor
   ```

1. **Open a new Terminal 2** in the participant repository and start the Squad
   conversation. Keep this same terminal open and use it for Squad prompts
   throughout the workshop.

   ```bash
   copilot --agent squad --yolo
   ```

   In Copilot, select the workshop model:

   ```text
   /model gpt-6-luna
   ```

   Ask Squad to propose and create the team, then approve its roster:

   ```text
   Squad, create my team:
   Blue, a developer; Red, a read-only security reviewer; and Green, a read-only
   remediation adviser. Also include the default built-in support agents. Do not
   add @copilot or any other workshop specialist. Explain each role, show me the
   complete roster, and wait for my approval before creating the team. Do not
   start implementation yet.
   ```

   At the `Roster approval` prompt, select `❯ Yes, hire this team`. If asked
   which language the app uses, answer `node app`.

   Squad creates the team only after your approval. Keep the default built-in
   support agents; they are expected.
1. After the roster is created and `squad doctor` passes, run the app startup
   command in Terminal 1. It adopts the role contracts, registers you, and
   starts the app.

   ```bash
   npm run workshop:start
   ```

   Open <http://localhost:3000> in the browser, or privately forward port 3000
   from Codespaces. Keep Terminal 1 open and return to the same Squad
   conversation. If startup fails, stop and resolve the reported error with
   the facilitator before asking Blue to implement. Each `bash` block is one
   command to paste into the named terminal. You do not need a new agent
   conversation per step.

   ```text
   Squad, read the adopted workshop routing and Blue, Red and Green charters
   under .squad before our first task. Summarize the role boundaries and the
   approvals you must wait for. Do not implement or advance a phase yet.
   ```
1. Ask Blue to integrate the supplied prototype, without inventing a defect:

   ```text
   Blue, implement city search by integrating the supplied prototype from
   app/data/city-search-prototype.txt into app/src/hotels.js unchanged.
   Preserve other functions and filters. Show the diff and normal-search checks.
   Do not commit or push without my approval.
   ```

   `Paris` and `paris` must return the same two public listings; unknown and
   empty cities return none. Preserve name, price, sorting, listing-detail and
   partner-summary behavior.
1. Restart the app in Terminal 1 so it serves Blue's change.

   ```bash
   npm run workshop:restart
   ```

   Return to the browser and use the web interface at <http://localhost:3000>.
   Search for Paris and other cities, then list how many listings the interface
   returns for each city. Do not enter challenge-specific input yet.

   ![Normal Paris search showing two hotel stays in the workshop web interface.](../images/sqli-demo/1-normal-search.png)

   *📊 Record the count shown in the browser as your normal-search baseline.*

   | City search | Listings returned |
   | --- | --- |
   | `Paris` | 2 |
   | `paris` | 2 |
   | An unknown city | 0 |
   | Empty search | 0 |

1. Review the diff and tests. Explicitly authorize Blue to commit the agreed
   feature and push `main` in your participant repository. Delivery means
   running locally plus pushed to `main`, not deploying a public website.

   ```text
   Blue, summarize the changed files and the checks actually run. Confirm that
   this is only the supplied synthetic challenge and show any unrelated edits.
   Stop before committing so I can review the diff.
   ```

   After reviewing that result, authorize this specific delivery:

   ```text
   Blue, I authorize committing only the reviewed challenge changes and
   pushing main in my participant repository. Do not include credentials
   or unrelated edits. Confirm the push succeeded and keep the delivery
   details for the next CodeQL review, then stop.
   ```

1. Review the delivery checks in Terminal 2. Run each command separately. The
   push starts analysis according to the preflighted CodeQL configuration; it
   does not prove that analysis has completed.

   ```bash
   npm run delivery
   ```

   After reviewing the result, publish the milestone:

   ```bash
   npm run phase -- red
   ```

### Checkpoint: What you can claim

You are ready for Step 2 when the app shows your change, Blue has pushed it to
`main`, and `npm run delivery` passes. You do not need to copy a commit identifier:
Blue keeps the delivery details, and the CodeQL review command checks that the
analysis matches the version you delivered.

Your ordinary-search counts confirm that the interface is serving the change.
They do not replace the CodeQL review or the challenge-specific investigation
in Step 2.

The `red` identifier means initial challenge delivery, not the Red agent.
Continue to [Step 2](2-step.md).

CodeQL, authentication and board `/health` checks happen before the timer.
`BOARD_URL` and `BOARD_TOKEN` are provided privately; keep the token value hidden.
Offline mode is supported. Never paste or commit the reporter token.

<details>
<summary>Having trouble? 🤷</summary>

- For role selection, ask Squad to explain each proposed specialist's scope.
- For search behavior, use the browser interface and compare city result counts.
- A 501 response means city search has not been implemented yet.
- If a delivery check fails, ask Blue to compare the integration with the
   supplied prototype before continuing.
- `npm run workshop:app` can relaunch the app without registering again.
- Adoption accepts the active Blue/Red/Green roster and the four default
   built-ins. Conflicting or custom teams are refused without modification.
   Ask the facilitator; do not erase learned history to force installation.
- You can ask an agent to explain a concept without requesting code or the next task.

For a confusing result, ask for evidence without authorizing another edit:

```text
Blue, explain the difference between the file on disk, the code currently
served by the app, and the commit on origin/main. Show which one each check
used. Do not change files, reset state or push while we diagnose this.
```

</details>
