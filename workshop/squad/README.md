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

## Mentor-led journey

The participant stays in one Squad conversation after initialization. Mentor
guides Blue startup and app observation, Red's explanation and participant-run
browser test, the first CodeQL reading (Purple), Green's approved implementation
and Red retest (Green), then Blue delivery and the final CodeQL reading (Blue).
The server publishes Red automatically after validating the canonical browser
payload. Purple, Green and Blue retain their participant checkpoints and phase
agreements. Never infer human reading from API success.

Squad runs `npm run codeql:review -- --phase=purple` or `--phase=blue`, supplies
the actual report URL, then waits for the participant to read it. Only after
confirmation does Squad repeat the command with `--confirm --analysis=ID --commit=SHA`.
`npm run phase -- <phase>` rechecks GitHub before publishing Purple or Blue.
No credentials or quiz answers are stored in these CodeQL receipts.

The baseline should be scanned before remediation. If Code Scanning is
inaccessible, the participant may explicitly run
`npm run codeql:review -- --phase=<phase> --override --reason="..."` for Purple
or Blue. The override is bound to the current `main` SHA and recorded as
unverified, never clean. It does not replace the local regression evidence and
can leave the scoreboard CI status pending. The app itself has no login.

The board can receive `ci-clean` after Green without advancing the phase.
Blue events include `repository` and `commitSha`; only a matching CI receipt
completes the team. Legacy Blue events remain accepted but cannot become clean
without delivery metadata. The two existing CI repository/SHA columns also hold
the expected Blue delivery when its CI receipt is still pending.
Board notifications are optional and never invalidate a successful security check.
Set the repository variable `BOARD_TEAM_ID` to the registered identity when it
differs from the repository owner's login, and `BOARD_SESSION_ID` for shared
sessions spanning UTC days. Keep tokens only in the existing secret configuration.

Edit this preset's source charters and routing, not generated `.squad/` copies.
Validate changes with `node --test test/content.test.mjs test/squad-init.test.mjs`
and `npm test` under Node.js 22. A live GitHub rehearsal is still necessary to
verify Code scanning permissions and real ingestion timing.
