---
title: Workshop Squad Preset
description: "Participant-led role contracts and non-destructive installation for Squad 1.0.0."
---

## Workshop Squad preset

This directory contains the portable Squad 1.0.0 preset installed by
`scripts/install-workshop-squad.mjs`.

### Installer behavior

The installer uses Node.js built-ins. It creates or overlays `.squad/` only
when the directory is absent, freshly initialized, or already marked as this
preset. It rejects custom teams rather than overwriting them. Re-running it
refreshes the role contracts while preserving histories, decisions,
configuration, and unmanaged Squad files.

### Roster and roles

Review and approve the roster in Squad. It contains Blue, Red, and Green for
the workshop, Squad's four built-in support agents (Scribe, Ralph, Rai, and
Fact Checker), and Purple as the human reviewer. Purple has no charter or
history. The contracts in `workshop/squad/contracts/` define agent roles; they
do not create a roster. Other agents or agent directories cause adoption to
stop without changing `.squad/`.

Green integrates the supplied synthetic baseline on `feature/city-search`,
then proposes the exact correction but does not edit or push it. Red reviews
security evidence without changing code or automating exploitation. Blue applies
the approved correction and delivers it through a participant-reviewed PR to
`main`.
Built-in support agents help with coordination; they do not replace participant
review or approval.

Purple reviews the named evidence at each checkpoint. The participant relays
Purple's decision and authorizes commits, pushes, merges, and phase publication.
After approval, publish a milestone with `npm run phase -- <phase>`
and confirm the command prompt. Purple does not implement, run commands, or
publish phases.

The supplied baseline is an explicitly authorized synthetic exercise. It uses
public hotel names, synthetic listing details, private challenge records, and
private app access. Never use customer, participant, or production data.

### Setup

1. In 🖥️ Terminal 1, run `squad init --no-workflows`. Wait for it to finish,
   then run `squad doctor`.
2. In 🤖 Terminal 2, run `copilot --agent squad --yolo`, select
	`mai-code-1.1-flash` with `/model mai-code-1.1-flash`, and ask Squad to create
	the roster described in Step 1.
3. At `Roster approval`, select `❯ Yes, hire this team`. Confirm that
	`.squad/team.md` exists.
4. In 🖥️ Terminal 1, run `npm run workshop:start`. This adopts the contracts,
	registers the participant, and starts the app. Startup stops on failure; it
	does not run `squad doctor`, approve a push, or publish a phase.
5. Follow [Task 03 in Step 1](../../.github/steps/1-step.md) to load the
	baseline and restart the app in order. Continue prompts in the same Terminal
	2 conversation. Run fallback commands in Terminal 1.

### Installer details

The installer manages role contracts directly instead of using `squad import`.
This keeps adoption deterministic and preserves participant histories, shared
decisions, configuration, and unmanaged files on reinstallation.

The root package defines this npm script:

```json
"squad:install-workshop-team": "node scripts/install-workshop-squad.mjs"
```

The installer sets `mai-code-1.1-flash` as the default model. It accepts
`--root <participant-repository>` and the optional `--adopt-recruited` flag for
automation and tests. It does not read environment files, copy source
histories, or include credentials.
