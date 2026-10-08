---
title: Workshop Squad Preset
description: "Participant-led role contracts and non-destructive installation for Squad 0.13.1."
---

## Workshop Squad preset

This directory is the portable, deterministic Squad 0.13.1 preset used by
`scripts/install-workshop-squad.mjs`.

The installer uses only Node.js built-ins. It creates or overlays `.squad/`
when that directory is absent, freshly initialized, or already marked as this
preset. Existing custom teams are rejected rather than overwritten. Re-running
the installer refreshes role contracts and preserves learned histories,
decisions, configuration, and unmanaged Squad-owned files such as templates.

Participants create the roster with Squad after reviewing its proposal. It
contains Blue, Red, and Green for workshop roles, plus Squad's four default
built-in support agents: Scribe, Ralph, Rai, and Fact Checker. The participant
casts and approves the team; `workshop/squad/contracts/` contains role rules,
not a pre-created roster. After approval, `npm run workshop:start` adopts the
contracts for Blue, Red, and Green while preserving histories and shared
decisions. Other members or agent directories cause a refusal without mutation.

Blue develops and implements approved corrections. Red reviews security
without editing or exploitation automation. Green proposes exact patches
without editing. The participant chooses tasks, reviews evidence, and authorizes
pushes; the built-ins support the team rather than teach mandatory lessons.

Participants run `squad doctor` in Terminal 1 after `squad init`. They then open
Terminal 2, start Copilot, select `gpt-6-luna` with `/model gpt-6-luna`, and ask
Squad to create the proposed team. At `Roster approval`, select
`❯ Yes, hire this team`; if asked which language the app uses, answer
`node app`. After approving the roster, they run
`npm run workshop:start` in Terminal 1 to adopt the workshop contracts, register
the participant, and launch the app. Startup does not run `squad doctor`; it
stops on failure and never approves a push or publishes a phase. All later
`npm` commands also run in Terminal 1.

Blue's initial delivery is an explicitly authorized integration of the supplied
synthetic challenge prototype, not a spontaneous model mistake. It is limited
to fictitious training records and private app access. Red and Green remain
read-only. The prototype is corrected only after the participant reviews
the exact-commit CodeQL finding and approves Green's patch.

The wrapper intentionally does not call `squad import`. In Squad 0.13.1,
`import --force` archives the entire existing squad under a timestamped name,
adds import timestamps to histories, and does not restore all initialized
support files. Those behaviors are neither deterministic nor an idempotent
overlay.

Expected npm script:

```json
"squad:install-workshop-team": "node scripts/install-workshop-squad.mjs"
```

Set `.squad/config.json` to use only `gpt-6-luna` before starting Copilot. The
The installer accepts `--root <participant-repository>` for automation and
tests, optionally combined with `--adopt-recruited`. It does not read
environment files, copy histories from the source repository, or include
credentials.
