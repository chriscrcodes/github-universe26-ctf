---
title: Deliver and Verify the Correction
description: "Blue implements the approved patch and the participant confirms the same CodeQL alert is fixed."
---

**Workshop steps:** ✅ [1. Baseline](1-step.md) → ✅ [2. Exposure](2-step.md) → ✅ [3. Correction scope](3-step.md) → 🎯 **4. Delivery** → ⏳ [Review](x-review.md) · Tasks 11–15 of 15

## Step 4: Deliver the correction and confirm fixed (Tasks 11 to 15)

### At a glance

* Current work: Verify the fix on `fix/city-search`, review the PR without merging, then confirm the hosted CodeQL alert is fixed on that branch.
* Roles: Blue delivers the approved fix; Purple reviews checkpoints; Red can compare scan results.
* Terminals: Continue in 🤖 Terminal 2 for Squad. Use 🖥️ Terminal 1 only for commands labeled there.
>
### Theory: Why `green` is validated before `blue` (and before `codeql`)

Step 4 advances through the final three scoreboard phases in strict order, matching the three environments where a fix must be proven:

| Sub-stage | Tasks | Scoreboard Phase | What is verified before publishing |
| --- | --- | --- | --- |
| **Stage 4A** | Tasks 11 to 12 | 🟢 **`green`** | **Local fix verified:** Blue applies Green's approved patch on `fix/city-search`, restarts the local app, and passes `npm run verify` |
| **Stage 4B** | Tasks 13 to 14 | 🔵 **`blue`** | **Correction branch validated:** Blue passes `npm run regressions` on pushed `fix/city-search`; Purple reviews the PR to `main`, which stays open |
| **Stage 4C** | Task 15 | 🛡️ **`codeql`** | **Hosted scan clean:** GitHub CodeQL scans the exact pushed commit on `fix/city-search` and shows the original alert `fixed` |

---

### Stage 4A: Verify the fix locally and publish Phase 3: `green` (Tasks 11 to 12)

> **Phase target:** `3. green`, local fix verified

11. **[Task 11] Apply the patch on `fix/city-search`, verify locally, and route to Purple (🤖 Terminal 2 + 🌐 Browser)**

    * **Action:** Continue in 🤖 Terminal 2, using the Squad conversation opened in Step 1. Do not start a new conversation. Ask **🔵 Blue** to apply the patch on `fix/city-search`, restart the app, run `npm run verify`, and route to **🟣 Purple**:

    > 🤖 **TERMINAL 2: Squad Conversation (Agent: 🔵 Blue ➔ 🟣 Purple)**

    ```text
    Blue, create fix/city-search from feature/city-search and apply only Green's
    exact patch that I approved. Preserve normal search and the other filters.

    Restart the app with `npm run workshop:restart`, run `npm run verify` against
    the corrected code, and route the corrected-code checkpoint to Purple with
    your diff against feature/city-search, the restarted-app results, and actual
    `npm run verify` output. Pause until I relay Purple's decision. Do not
    publish a phase or push yet.
    ```

    > 🌐 **BROWSER: Web Interface (<http://localhost:3000>)**

    * **Action:** Test <http://localhost:3000> in the browser to confirm the injection now returns **0 listings**:

    | Check | Expected corrected behavior |
    | --- | --- |
    | `Paris`, then `paris` | The same 2 public listings |
    | `' OR 1=1 --` (demonstration input) | **0 listings** (treated as literal city text) |

    ![Corrected search returns no listings for the supplied demonstration input.](../images/sqli-demo/3-fixed-search.png)

    *✅ Confirm the corrected result after restarting the app.*

12. **[Task 12] Relay Purple's approval, publish Phase 3: `green`, and open the PR to `main` (🤖 Terminal 2)**

    * **Action:** Relay **🟣 Purple**'s approval to publish `green`, then have **🔵 Blue** push `fix/city-search`, open the PR to `main`, and route the PR checkpoint to **🟣 Purple**:

    > 🤖 **TERMINAL 2: Squad Conversation (Publish `green`, Open PR & Route to 🟣 Purple)**

    ```text
    Purple approves the corrected-code checkpoint. I authorize running
    `npm run phase -- green` now and confirm the prompt to record local fix verification.

    Then I authorize Blue to commit only the reviewed correction and agreed tests on
    fix/city-search, push that branch, and open a PR targeting main. Do not merge
    yet. Then route the pull-request checkpoint to Purple with the PR URL, source
    commit, complete PR diff against main, and required check results. Pause
    until I relay Purple's decision.
    ```

---

### Stage 4B: Validate `fix/city-search` and publish Phase 4: `blue` (Tasks 13 to 14)

> **Phase target:** `4. blue`, corrected branch validated and PR reviewed but not merged

13. **[Task 13] Keep the PR open and run regressions on `fix/city-search` (🤖 Terminal 2)**

    * **Action:** Review the PR on GitHub. After **🟣 Purple** approves its diff and checks, ask **🔵 Blue** to stay on `fix/city-search`, sync it with `origin/fix/city-search`, run `npm run regressions`, and route the branch evidence to **🟣 Purple**. Do not merge the PR:

    > 🤖 **TERMINAL 2: Squad Conversation (Validate Correction Branch & Route to 🟣 Purple)**

    ```text
    Purple approves the pull-request review checkpoint. I will not merge the PR
    during this end-to-end validation. Blue, switch to fix/city-search, sync it
    with origin/fix/city-search, and run `npm run regressions` on that branch.

    Then route the corrected-branch checkpoint to Purple with the branch name,
    pushed commit, and actual `npm run regressions` result. Pause until I relay
    Purple's decision. Do not switch to main, merge the PR, or publish a phase.
    ```

14. **[Task 14] Relay Purple's approval and publish Phase 4: `blue` (🤖 Terminal 2)**

    * **Action:** Relay **🟣 Purple**'s approval to publish the `blue` corrected-branch validation milestone:

    > 🤖 **TERMINAL 2: Squad Conversation (Relay 🟣 Purple Approval & Publish `blue`)**

    ```text
    Purple approves the corrected-branch checkpoint. I authorize running
    `npm run phase -- blue` now and confirm the prompt to record validation on
    fix/city-search. Keep the PR open and stop while we check the hosted CodeQL
    analysis for this exact branch commit.
    ```

---

### Stage 4C: Confirm hosted CodeQL scan and publish Phase 5: `codeql` (Task 15)

> **Phase target:** `5. codeql`, hosted scan clean

15. **[Task 15] Review the fixed CodeQL alert on `fix/city-search` and publish Phase 5: `codeql` (🌐 Browser + 🤖 Terminal 2)**

    > 🌐 **BROWSER: GitHub Repository (`Security > Code scanning`)**

    * **Action:** Check **Security > Code scanning** on GitHub until the analysis for the exact `fix/city-search` commit completes and shows the original alert **fixed**.

    > 🤖 **TERMINAL 2: Squad Conversation (Inspect `fixed` Report & Route to 🟣 Purple)**

    ```text
    Squad, run `npm run codeql:review -- fixed` and have Red compare the initial
    finding with the final CodeQL report on my corrected fix/city-search SHA.

    If analysis is complete and the same alert shows fixed with zero results,
    route the final CodeQL checkpoint to Purple with the original alert state,
    corrected commit, and successful analysis results. If analysis is still
    pending or failed, state what remains unverified and stop without routing
    approval. Do not publish a phase yet.
    ```

    * **Action:** Once the scan is complete and **🟣 Purple** approves, paste this final prompt:

    > 🤖 **TERMINAL 2: Squad Conversation (Relay 🟣 Purple Approval & Publish `codeql`)**

    ```text
    Purple approves the final CodeQL checkpoint. I have confirmed the original
    alert is fixed on the pushed fix/city-search commit. I authorize running
    `npm run codeql:review -- fixed --reviewed` and `npm run phase -- codeql`
    now to complete the workshop.
    ```

    <details>
    <summary>🖥️ Manual fallback commands (if you prefer running delivery regression in 🖥️ Terminal 1)</summary>

     Run the commands in order. Stop if one fails, and wait for Purple's approval
     wherever a checkpoint is specified.

     1. Restart the app, then verify the local fix:

         ```bash
         npm run workshop:restart
         ```

         ```bash
         npm run verify
         ```

     2. After Purple approves the corrected-code checkpoint, publish `green` and
         confirm the prompt:

         ```bash
         npm run phase -- green
         ```

     3. Keep the PR open. Switch to the correction branch, sync the pushed
         commit, and run regressions in order. Stop if any command fails:

         ```bash
         git switch fix/city-search &&
         git pull --ff-only origin fix/city-search &&
         npm run regressions
         ```

    4. After Purple approves the corrected-branch checkpoint, publish `blue` and
         confirm the prompt:

         ```bash
         npm run phase -- blue
         ```

     5. After CodeQL confirms the alert is fixed and Purple approves, record your
         attestation, then publish `codeql`:

         ```bash
         npm run codeql:review -- fixed --reviewed
         ```

         ```bash
         npm run phase -- codeql
         ```

    </details>

---

### ✅ Checkpoint: All 5 phases complete

- [ ] **Phase 3 (`green`):** Local app restarted and `npm run verify` passed on `fix/city-search`.
- [ ] **Phase 4 (`blue`):** `npm run regressions` passed on `fix/city-search`; the PR to `main` was reviewed and remains open.
- [ ] **Phase 5 (`codeql`):** GitHub CodeQL analysis on the exact `fix/city-search` commit confirmed the original alert is **fixed** with zero remaining findings (`WORKSHOP COMPLETE`).

**Next step:** Continue to the [Review](x-review.md).

<details>
<summary>Having trouble?</summary>

- If verification differs from the diff, confirm the app restarted from the corrected code.
- If the PR is not open, ask Blue to show its source branch, target branch,
  checks and scoped correction diff.
- If CodeQL remains open or fails, report that result and ask Red to inspect it.
- Missing or dismissed alerts do not count as fixed. Do not change scan settings
  to hide a finding or substitute another repository's result.
- If GitHub analysis is still pending, keep the workshop pending and resume
   the evidence review later. Do not publish final completion.

For a verification failure:

```text
Blue, diagnose the failing check before making another change. Confirm the
running app was restarted, show the expected and observed result, and identify
whether the approved patch or its test needs to change. Propose a scoped diff
and wait for renewed approval. Do not reset progress or weaken the check.
```

For a late scan:

```text
Red, summarize the corrected delivery SHA, passing local evidence and current
CodeQL status. Tell me exactly which hosted evidence is still missing and
what to inspect when analysis finishes. Do not mark the workshop complete.
```

</details>
