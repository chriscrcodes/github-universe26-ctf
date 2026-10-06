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

Participants first ask Squad to recruit Blue, Red, and Green. To explicitly
adopt that exact active roster, run:

```bash
npm run squad:install-workshop-team -- --adopt-recruited
```

The casting registry must contain active `blue`, `red`, and `green` entries
named Blue, Red, and Green. Compatible workshop built-ins may be present;
other members or agent directories cause a refusal without mutation. Adoption
replaces the workshop routing, roster metadata, and role charters, not histories
or shared decisions. It is not a force-overwrite option for arbitrary teams.

Blue develops and implements approved corrections. Red reviews security
without editing or exploitation automation. Green proposes exact patches
without editing. The participant chooses tasks, reviews evidence, and authorizes
pushes; the built-ins support the team rather than teach mandatory lessons.

The wrapper intentionally does not call `squad import`. In Squad 0.13.1,
`import --force` archives the entire existing squad under a timestamped name,
adds import timestamps to histories, and does not restore all initialized
support files. Those behaviors are neither deterministic nor an idempotent
overlay.

Expected npm script:

```json
"squad:install-workshop-team": "node scripts/install-workshop-squad.mjs"
```

The script accepts `--root <participant-repository>` for automation and tests,
optionally combined with `--adopt-recruited`.
It does not read environment files, copy histories from the source repository,
or include credentials.
