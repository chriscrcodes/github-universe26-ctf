---
title: Discover Squad and Deliver the Synthetic Challenge
description: "Recruit three specialists, integrate the supplied prototype and observe its synthetic exposure."
---

## Step 1: Recruit your team and deliver search

Target: minutes 0-10. Recruit during minutes 0-3, implement during 3-8,
then observe the exposure and authorize delivery during 8-10.

### 📖 Theory: Separate responsibilities

Squad keeps a team's roles, decisions, and context in `.squad/`. Blue develops,
Red reviews security, and Green advises on corrections. You decide who works
next. Blue integrates a supplied, intentionally vulnerable training prototype
that you will inspect and correct together. Use only fictitious hotel records
and localhost or a privately forwarded Codespaces port; never use real data.

Think of Squad as your coordinator, not an unattended pipeline. You give one
task, inspect its result, then choose the next task. Separate roles make it
easier to ask who implemented a change, who reviewed it, and who proposed the
correction. They do not remove your responsibility for any of those decisions.

The app begins with city search unavailable. Integrating the prototype changes
real application behavior; reading the prototype alone does not deliver the
feature. A normal search can work even when a security boundary is broken,
which is why you will compare normal behavior with the supplied demonstration.

### ⌨️ Activity: Recruit, then deliver

1. In your participant repository terminal, run `squad init --no-workflows`.
   Keep the repository's existing Squad agent configuration. If setup offers
   to add the Copilot coding agent to the team, decline that option.
1. Start `copilot --agent squad`. Ask Squad to recruit Blue (developer), Red
   (read-only security reviewer), and Green (read-only remediation adviser).
   Copilot CLI is the interface; Squad coordinates the team. Neither is a
   fourth workshop specialist. Do not recruit the Copilot coding agent.
   Review and approve the proposed team before it is created.

   ```text
   Squad, propose a team with exactly Blue, Red and Green for this workshop.
   Blue implements, Red reviews security without editing, and Green proposes
   corrections without editing. Do not add the Copilot coding agent to the team.
   Explain each role and wait for my approval
   before creating the team. Do not start implementation yet.
   ```

   Check that the three specialists are Blue, Red and Green, then approve the
   roster in your own words. Squad may include built-in support roles such as
   Scribe; keep those defaults, but do not add Copilot or another specialist.
1. Back in the terminal, run `npm run workshop:start`. This adopts the roster
   with `--adopt-recruited`, applies workshop contracts while preserving
   histories, runs `squad doctor`, registers you, and launches the app.
   Open <http://localhost:3000>, or privately forward port 3000 from Codespaces.
   Return to the same Squad conversation. If startup fails, stop and resolve
   the reported error with the facilitator before asking Blue to implement.
   Use a second VS Code terminal for shell commands if Copilot CLI occupies
   the first. Commands in `bash` blocks run at the shell prompt; prompts in
   `text` blocks go to Squad. You do not need a new agent conversation per step.

   ```text
   Squad, read the adopted workshop routing and Blue, Red and Green charters
   under .squad before our first task. Summarize the role boundaries and the
   approvals you must wait for. Do not implement or advance a phase yet.
   ```
1. Ask Blue to integrate the supplied prototype, without inventing a defect:

   ```text
   Blue, integrate the supplied training prototype from
   app/data/city-search-prototype.txt into app/src/hotels.js unchanged.
   Preserve other functions and filters. Do not correct the prototype yet.
   Show the diff and normal-search checks; do not commit or push without me.
   ```

   `Paris` and `paris` must return the same two public listings; unknown and
   empty cities return none. Preserve name, price, sorting, listing-detail and
   partner-summary behavior. The supplied demonstration input below should
   also reveal the fictitious unpublished records that you will investigate.
1. Restart with `npm run workshop:restart`. Try a normal Paris search, then
   paste the supplied demonstration input into the city field:

   ```text
   ' OR 1=1 --
   ```

   Observe the unpublished synthetic records. Explain which visibility rule
   was bypassed. Do not generate other payloads or target external systems.
   Inspect `listingStatus` in the results: seeing a city match is not enough
   to decide that a record was intended for public visibility.

   | Search | Expected observation |
   | --- | --- |
   | `Paris`, then `paris` | The same two public listings |
   | An unknown city, then an empty field | No listings |
   | Supplied demonstration input | The seeded dataset, including unpublished fictitious records |

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

1. Review `npm run delivery`, then publish `npm run phase -- red` yourself.
   Delivery checks both normal search and the exact synthetic exposure against
   the running app. The push starts analysis according to the preflighted
   CodeQL configuration; it does not prove that analysis has completed.

### Checkpoint: What you can claim

You are ready for Step 2 when the app shows your change, Blue has pushed it to
`main`, and `npm run delivery` passes. You do not need to copy a commit identifier:
Blue keeps the delivery details, and the CodeQL review command checks that the
analysis matches the version you delivered.

The exposure receipt proves the supplied behavior occurred in the running app.
It does not prove that CodeQL has analyzed the commit or that the app is safe.
Explain: "Normal search returned public records, but the supplied input also
returned unpublished records. The intended visibility boundary was bypassed."
Use your own observations rather than accepting that sentence without checking.

The `red` identifier means initial challenge delivery, not the Red agent.
Continue to [Step 2](2-step.md).

CodeQL, authentication and board `/health` checks happen before the timer.
`BOARD_URL` and `BOARD_TOKEN` are provided privately; keep the token value hidden.
Offline mode is supported. Never paste or commit the reporter token.

<details>
<summary>Having trouble? 🤷</summary>

- For role selection, ask Squad what each proposed specialist would own.
- For search behavior, start with a normal Paris search and the PUBLIC boundary.
- A 501 response means city search has not been implemented yet.
- A failed exposure check is not a completed baseline. Ask Blue to compare
   the integration against the supplied prototype, not to invent another flaw.
- `npm run workshop:app` can relaunch the app without registering again.
- Adoption accepts the exact active Blue/Red/Green roster, with compatible
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
