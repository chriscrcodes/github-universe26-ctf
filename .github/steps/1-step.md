---
title: Discover Squad and Deliver the Synthetic Challenge
description: "Create your Squad team, integrate the supplied prototype, and verify ordinary city searches."
---

## Step 1: Recruit your team and deliver search

Terminal key: 🖥️ Terminal 1 is for participant shell commands; 🤖 Terminal 2 is
the Copilot CLI/Squad conversation for prompts. Run shell commands in Terminal 1
unless a command block names another terminal. 📖 introduces theory, ⌨️ introduces
activities, and other emoji are visual markers; follow the accompanying text.

### 📖 Theory: Separate responsibilities

Squad keeps a team's roles, decisions, and context in `.squad/`. Green integrates
the supplied training prototype and owns its initial feature branch. Red reviews
security. Blue implements the approved correction and delivers it to `main`
through a reviewed pull request. You decide who works next. Public listings use
real hotel names; prices, dates, room options and internal challenge records are
synthetic. Use only the supplied dataset and local or privately forwarded app
access. Never use customer, participant or production data.

Think of Squad as your coordinator, not an unattended pipeline. You give one
task, inspect its result, then choose the next task. Separate roles make it
easier to ask who implemented a change, who reviewed it, and who proposed the
correction. They do not remove your responsibility for any of those decisions.

The app begins with city search unavailable. Integrating the prototype changes
real application behavior; reading the prototype alone does not deliver the
feature. Start by checking ordinary city searches and recording how many
listings each search returns. The challenge-specific investigation comes later.

Public listings use real hotel names; prices, dates, room options and internal
challenge records are synthetic. The app does not show live availability or
accept bookings.

![Paris search before city search is implemented, showing the app's not-available-yet message.](../images/sqli-demo/0-search-not-implemented.png)

*🧱 At this point, the app is running, but city search has not been delivered.*

### ⌨️ Activity: Recruit, then deliver

1. In 🖥️ Terminal 1, opened at the participant repository root, initialize Squad.
   If prompted `Add @copilot as an autonomous team member? [Y/n]`, answer `No`.

   ```bash
   squad init --no-workflows
   ```

1. Still in 🖥️ Terminal 1, run the health check yourself. The warnings for
   `vscode-jsonrpc exports field` and `copilot-sdk session.js ESM patch` are
   expected in this workshop environment and are non-blocking. Resolve any
   other reported issue before continuing.

   ```bash
   squad doctor
   ```

1. **Open a new 🤖 Terminal 2 (Copilot CLI)** in the participant repository and
   start the Squad conversation. Keep this same terminal open and use it for Squad prompts
   throughout the workshop.

   ```bash
   copilot --agent squad --yolo
   ```

   In Copilot, select the workshop model:

   ```text
   /model mai-code-1.1-flash
   ```

   Ask Squad to propose and create the team, then approve its roster:

   ```text
   Squad, create my team:
   Project: GitHub Universe workshop.
    Blue: implements participant-approved changes and delivers them through a
    reviewed pull request.
    Red: read-only security reviewer.
    Green: implements assigned features and advises on remediation.
    Purple: human workshop validation reviewer. Add Purple as a human roster
    member with no agent charter or history; review each workshop checkpoint.
   Include the default built-ins support squad members; no @copilot or other AI specialists.
   Preserve these names and roles. Use the complete-roster fast path. Show all
   eight roster entries, including seven agents and Purple as a human, with
   roles/scopes, then wait for my approval. When I select `Yes, hire this team`,
   that approves this roster and authorizes Phase 2 immediately. Do not stop or
   ask for another confirmation after that selection. Create the standard Squad
   state under `.squad/`, including the team roster, routing, decisions, casting
   state and required agent directories, charters and histories. Purple is a
   human roster entry only, with no charter or history. Create `.gitattributes`
   if standard Squad setup requires it. Do not inspect or modify workshop source
   files or app code; this restriction does not apply to creating Squad state.
   Do not start the app or implement. Stop only after creating the state and
   report the files and directories created.
   ```

   At the `Roster approval` prompt, select `❯ Yes, hire this team`.

   This selection approves the proposed roster and starts Squad's file-creation
   phase. Confirm `.squad/team.md` and the standard Squad state were created
   before continuing. The roster contains seven agents, including the four
   default built-ins, and Purple as a human reviewer. Squad routes review
   requests to Purple and pauses; you relay the materials and Purple's decision.
   The installer preserves Purple's human roster entry when it adopts the
   workshop contracts.

   ```text
   Squad : show me team members and roles
   ```

1. Run the app startup command in 🖥️ Terminal 1. It adopts the role contracts,
   registers you, and starts the app.

   ```bash
   npm run workshop:start
   ```

   Open <http://localhost:3000> in the browser, or privately forward port 3000
   from Codespaces. Keep 🖥️ Terminal 1 open and return to the same Squad
   conversation. If startup fails, stop and resolve the reported error with
   the facilitator before asking Green to implement. Each `bash` block is one
   command to paste into the named terminal. You do not need a new agent
   conversation per step.
1. Ask Green to integrate the supplied prototype, without inventing a defect:

   ```text
   Green, implement city search by integrating the supplied prototype from
   app/data/city-search-prototype.txt into app/src/hotels.js unchanged.
   Preserve other functions and filters. Show the diff and normal-search checks.
   Do not commit or push without my approval.
   ```

   `Paris` and `paris` must return the same two public listings; unknown and
   empty cities return none. Preserve name, price, sorting, listing-detail and
   partner-summary behavior.
1. Restart the app in 🖥️ Terminal 1 so it serves Green's change.

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

1. Review the diff and tests. Explicitly authorize Green to commit the agreed
   feature and push `feature/city-search` in your participant repository.
   Delivery means running locally plus pushed to that branch, not deploying a
   public website.

   ```text
   Green, summarize the changed files and the checks actually run. Confirm that
   this is only the supplied synthetic challenge and show any unrelated edits.
   Stop before committing so I can review the diff.
   ```

   After reviewing that result, authorize this specific delivery:

   ```text
   Green, I authorize committing only the reviewed challenge changes and
   pushing feature/city-search in my participant repository. Do not include credentials
   or unrelated edits. Confirm the push succeeded and keep the delivery
   details for the next CodeQL review, then stop.
   ```

1. Review the delivery checks in 🤖 Terminal 2. Run each command separately. The
   push starts analysis according to the preflighted CodeQL configuration; it
   does not prove that analysis has completed.

   ```bash
   npm run delivery
   ```

   Before publishing the milestone, ask Squad to route the exact delivery
   checkpoint to Purple:

   ```text
   Squad, route the Step 1 checkpoint to Purple. Include the pushed commit,
   reviewed feature diff, Paris and other normal-search counts, and the actual
   npm run delivery result. Pause until I relay Purple's decision. Do not publish
   a phase or infer approval from passing checks.
   ```

   Relay Purple's response to Squad. If Purple rejects the evidence or asks for
   changes, stop progression, address the concern and request a new review.
   Only after Purple approves may you choose to publish the milestone:

   ```bash
   npm run phase -- red
   ```

### Checkpoint: What you can claim

You are ready for Step 2 when the app shows your change, Green has pushed it to
`feature/city-search`, `npm run delivery` passes, and Purple has approved the
checkpoint. You do not need to copy a commit identifier:
Blue keeps the delivery details, and the CodeQL review command checks that the
analysis matches the version you delivered.

Your ordinary-search counts confirm that the interface is serving the change.
They do not replace the CodeQL review or the challenge-specific investigation
in Step 2.

The `red` identifier means initial challenge delivery, not the Red agent.
Continue to [Step 2](2-step.md).

The facilitator preflights CodeQL, authentication and board `/health` checks.
`BOARD_URL` and `BOARD_TOKEN` are provided privately; keep the token value hidden.
Offline mode is supported. Never paste or commit the reporter token.

<details>
<summary>Having trouble? 🤷</summary>

- For role selection, ask Squad to explain each proposed specialist's scope.
- For search behavior, use the browser interface and compare city result counts.
- A 501 response means city search has not been implemented yet.
- If a delivery check fails, ask Green to compare the integration with the
   supplied prototype before continuing.
- `npm run workshop:app` can relaunch the app without registering again.
- Adoption accepts the active Blue/Red/Green roster and the four default
   built-ins. Conflicting or custom teams are refused without modification.
   Ask the facilitator; do not erase learned history to force installation.
- You can ask an agent to explain a concept without requesting code or the next task.

For a confusing result, ask for evidence without authorizing another edit:

```text
Blue, explain the difference between the file on disk, the code currently
served by the app, and the commit on origin/feature/city-search. Show which one each check
used. Do not change files, reset state or push while we diagnose this.
```

</details>
