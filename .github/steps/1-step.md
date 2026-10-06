---
title: Discover Squad and Deliver Hotel Search
description: "Recruit three specialists and deliver public city search on main."
---

## Step 1: Recruit your team and deliver search

Target: minutes 0-12. Objective: discover Squad, recruit your specialists,
and deliver public hotel search for today's launch.

### 📖 Theory: Separate responsibilities

Squad keeps a team's roles, decisions, and context in `.squad/`. Blue develops,
Red reviews security, and Green advises on corrections. You decide who works
next. None of them intentionally introduces a defect to create an exercise.

### ⌨️ Activity: Recruit, then deliver

1. In your participant repository terminal, run `squad init --no-workflows`.
   Keep the repository's existing Copilot agent rather than replacing it.
1. Start `copilot --agent squad`. Ask Squad to recruit Blue (developer), Red
   (read-only security reviewer), and Green (read-only remediation adviser).
   Review and approve the proposed team before it is created.
1. Back in the terminal, run
   `npm run squad:install-workshop-team -- --adopt-recruited`, then `squad doctor`.
   This applies the workshop role contracts while preserving team histories.
1. If a board is configured, check it without revealing credentials:

   ```bash
   test -n "${BOARD_URL:-}" && echo "BOARD_URL is set" || echo "BOARD_URL is missing"
   test -n "${BOARD_TOKEN:-}" && echo "BOARD_TOKEN is set (value hidden)" || echo "BOARD_TOKEN is missing"
   curl --fail --silent --show-error "${BOARD_URL%/}/health"
   ```

   Offline mode is supported. Never paste or commit the reporter token.
1. Run `npm run workshop:start`, then `npm run workshop:app`.
   Open <http://localhost:3000>, or forward port 3000 from Codespaces.
1. Ask Blue to deliver city search. Choose your own wording and acceptance
   criteria: `Paris` and `paris` return the same two public listings; unknown
   and empty cities return none; unpublished listings never appear. Existing
   name, price, sorting, listing-detail, and partner-summary behavior stays intact.
1. Review the diff and tests. Explicitly authorize Blue to commit the agreed
   feature and push `main` in your participant repository. Delivery means
   running locally plus pushed to `main`, not deploying a public website.
1. Restart the app from the delivered code using `npm run workshop:restart`.
   Review `npm run delivery`, then publish `npm run phase -- red` yourself.

The `red` identifier now means initial delivery, not an attack demonstration.
Continue to [Step 2](2-step.md).

<details>
<summary>Having trouble? 🤷</summary>

- For role selection, ask Squad what each proposed specialist would own.
- For search behavior, start with a normal Paris search and the PUBLIC boundary.
- A 501 response means city search has not been implemented yet.
- Adoption accepts the exact active Blue/Red/Green roster, with compatible
  built-ins. Conflicting or custom teams are refused without modification.
  Ask the facilitator; do not erase learned history to force installation.
- You can ask an agent to explain a concept without requesting code or the next task.

</details>
