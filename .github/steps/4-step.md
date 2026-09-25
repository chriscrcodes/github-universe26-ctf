## Step 4: Deliver with Blue and read the final CodeQL report

**Hands-on target: minutes 30–40.** Minutes 40–45 are the debrief.

**Objective:** Blue delivers Green's approved correction to `main`; you read the
final CodeQL report for that commit (or accept an explicit unverified override)
before authorizing the `blue` phase.

**Requires:** `green` published after implementation, verification and Red's retest.

### 📖 Theory: Security fixes need regression and scan evidence

A fix is proven when a normal case, negative cases, the original attack, and the publication boundary all pass. Local tests give immediate evidence. CodeQL confirms separately and may stay pending for several minutes.

### ⌨️ Activity: Verify like a defender

Stay in the same conversation and answer Mentor.

1. **Your decision — authorize delivery.** Mentor asks whether Blue may deliver
   Green's approved, verified correction to `main`. Answer yes. Blue shows the
   final diff, verifies locally, then commits and pushes only the authorized
   change. A different diff requires another approval. Protected `main` uses
   the approved PR and merge process.
1. After the push, Blue runs `npm run regressions` to record the delivered SHA.
   ✅ Regressions print `PASS: participant-selected regression matrix preserved the public-listing boundary.`
   Blue returns to Mentor.
1. Squad runs `npm run codeql:review -- --phase=blue` without asking. It waits
   for the Security verification workflow to succeed and checks the CodeQL
   analysis for the exact `main` commit. **CodeQL pending** blocks publication
   unless you explicitly accept the unverified override below.
1. **Your decision — read the final report or accept an override.** Open the
   report link Mentor supplies:
   `https://github.com/<handle>/github-universe26-ctf/security/code-scanning`.
   Confirm that the initial SQL injection alert is **fixed**, not dismissed,
   and that no CodeQL alerts remain open on `main`. Tell Mentor what changed
   from the initial report. Only then does Squad record **CodeQL clean** with
   `npm run codeql:review -- --phase=blue --confirm --analysis=ID --commit=SHA`.
   If the report cannot be read (for example, GitHub returns `403`), accept
   Mentor's override with a short reason and Squad records:

   ```sh
   npm run codeql:review -- --phase=blue --override --reason="GitHub returned 403 for Code Scanning; participant accepts an unverified review."
   ```

   This skips the unavailable remote CodeQL/Actions review for this phase, does
   not mark CodeQL clean, and may leave the scoreboard's CI status pending.
1. **Your decision — Mentor's Blue checkpoint and phase readiness.** Answer the
   three questions one at a time, then tell Mentor the Blue phase is ready.
   Squad rechecks the report and runs `npm run phase -- blue`.

<details>
<summary>If Mentor stalls</summary><br/>

Send `Mentor, continue.` To trigger delivery directly, ask Blue:

```text
Blue, push Green's approved and verified correction to main.
```

</details>

**Expected evidence:**

- The delivered SHA matches the successful workflow and clean CodeQL analysis, or your Blue override is explicitly marked unverified.
- The original alert is fixed and your final reading is recorded, or the override reason is recorded; `Phase blue recorded.`
- A `CAPTURE COMPLETE` recap listing your phases and captured flag. The recap is authoritative even if the scoreboard is offline.
- CodeQL clean, with the matching CI receipt and Blue publication completing the
   board entry → go to the [Review](x-review.md).

<details>
<summary>Having trouble? 🤷</summary><br/>

- **`participant approval is missing`:** return to Mentor and Step 3.
- **`BLOCKED: application is not running`:** ask Blue to restart the app with `npm run workshop:app -- --restart`.
- **`city search should be case-insensitive`:** the patch dropped `COLLATE NOCASE`. Ask Green for the approved line from Step 3.
- **`the approved correction must be committed and pushed on main`:** `app/src/search-query.js` has uncommitted changes or `main` is not pushed. Ask Blue to commit and push, then rerun regressions.
- **`git push` rejected:** ask Blue to check the participant remote and branch protection; never bypass required reviews.
- **Payload still returns listings:** ask Green to investigate before continuing.
- **Scan pending, failed or inaccessible:** wait, or use the explicit Blue override above if you accept proceeding without verification.
- **Report or commit changed:** read the new report and confirm it again.
- **Scoreboard offline:** local phase progress still works. A CodeQL override remains visibly unverified.

</details>
