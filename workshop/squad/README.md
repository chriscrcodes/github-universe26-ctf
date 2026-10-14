---
title: Workshop Squad Preset
description: "Participant-led role contracts and non-destructive installation for Squad 1.0.0."
---

## Workshop Squad preset

This directory is the portable, deterministic Squad 1.0.0 preset used by
`scripts/install-workshop-squad.mjs`.

The installer uses only Node.js built-ins. It creates or overlays `.squad/`
when that directory is absent, freshly initialized, or already marked as this
preset. Existing custom teams are rejected rather than overwritten. Re-running
the installer refreshes role contracts and preserves learned histories,
decisions, configuration, and unmanaged Squad-owned files such as templates.

Participants create the roster with Squad after reviewing its proposal. It
contains Blue, Red, and Green for workshop roles, Squad's four default
built-in support agents (Scribe, Ralph, Rai, and Fact Checker), and Purple as a
human validation reviewer. The participant approves the seven agents and Purple
as a human member in the same roster. Purple has no charter or history.
`workshop/squad/contracts/` contains agent role rules, not a pre-created roster.
After approval, `npm run workshop:start` adopts the contracts for Blue, Red,
and Green while preserving histories, shared decisions, and human roster rows.
Other agents or agent directories cause a refusal without mutation.

Green integrates the supplied synthetic prototype and publishes only to
`feature/city-search`; after the security review, Green advises on the correction
without editing it. Red reviews security without editing or exploitation
automation. Blue applies the approved correction and delivers it to `main`
through a PR, merging only after participant review and authorization. The
participant chooses tasks and reviews evidence; the built-ins support the team
rather than teach mandatory lessons.

Participants run `squad doctor` in 🖥️ Terminal 1 after `squad init`. They then open
🤖 Terminal 2, start Copilot, select `mai-code-1.1-flash` with
`/model mai-code-1.1-flash`, and ask
Squad to create the proposed team using the role definitions in Step 1. At
`Roster approval`, select `❯ Yes, hire this team` to trigger Squad's standard
file-creation phase. Confirm `.squad/team.md` exists before running
`npm run workshop:start` in 🖥️ Terminal 1 to adopt the workshop contracts, register
the participant, and launch the app. Startup does not run `squad doctor`; it
stops on failure and never approves a push or publishes a phase. All later
`npm` commands also run in 🖥️ Terminal 1.

Purple reviews the named evidence at each workshop checkpoint. Squad pauses for
the human decision; the participant relays it and remains responsible for task,
commit, merge, and phase-publication authorization. Purple does not implement,
run commands, or publish phases.

Green's initial delivery is an explicitly authorized integration of the supplied
synthetic challenge prototype, not a spontaneous model mistake. It is limited
to the supplied dataset, which uses real public hotel names and synthetic
listing details and internal challenge records, plus private app access. Red
remains read-only. The prototype is corrected only after the participant
reviews the exact-commit CodeQL finding and approves Green's patch; Blue
publishes the fix to `main` through a reviewed PR.

The wrapper intentionally installs the workshop's managed contracts directly
instead of using `squad import`. This keeps adoption deterministic and
preserves participant histories, shared decisions, configuration, and
unmanaged files when the installer is rerun.

Expected npm script:

```json
"squad:install-workshop-team": "node scripts/install-workshop-squad.mjs"
```

The installer sets `.squad/config.json` to use `mai-code-1.1-flash` as the
default model. It accepts `--root <participant-repository>` for automation and
tests, optionally combined with `--adopt-recruited`. It does not read
environment files, copy histories from the source repository, or include
credentials.
