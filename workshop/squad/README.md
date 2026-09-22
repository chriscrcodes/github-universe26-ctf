# Workshop Squad preset

This directory is the portable, deterministic Squad 0.13.1 preset used by
`scripts/install-workshop-squad.mjs`.

The installer uses only Node.js built-ins. It creates or overlays `.squad/`
when that directory is absent, freshly initialized, or already marked as this
preset. Existing custom teams are rejected rather than overwritten. Re-running
the installer produces the same managed files and preserves unmanaged
Squad-owned files such as templates.

The wrapper intentionally does not call `squad import`. In Squad 0.13.1,
`import --force` archives the entire existing squad under a timestamped name,
adds import timestamps to histories, and does not restore all initialized
support files. Those behaviors are neither deterministic nor an idempotent
overlay.

Expected npm script:

```json
"squad:install-workshop-team": "node scripts/install-workshop-squad.mjs"
```

The script accepts `--root <participant-repository>` for automation and tests.
It does not read environment files, copy histories from the source repository,
or include credentials.
