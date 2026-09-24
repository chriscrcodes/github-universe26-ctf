## Step 4: Blue applies, tests, and publishes

**Hands-on target: minutes 30–40.** Minutes 40–45 are the debrief.

**Objective:** Blue applies only the approved patch, proves it with local verification and regressions, commits and pushes `main`; you publish the `green` and `blue` phases.

**Requires:** approval recorded in Step 3 (`APPROVED: parameter binding may be applied by Blue.`).

### 📖 Theory: Security fixes need regression and scan evidence

A fix is proven when a normal case, negative cases, the original attack, and the publication boundary all pass. Local tests give immediate evidence. CodeQL confirms separately and may stay pending for several minutes.

### ⌨️ Activity: Verify like a defender

**What to do:**

1. Ask Blue to apply the patch and propose a matrix:

   ```text
   Blue, apply only the approved patch. Propose a matrix covering the normal
   case, negative cases, the supplied payload, and the publication boundary.
   Then wait for my approval before testing, committing, and pushing.
   ```

1. Approve the matrix only if it covers every row:

   | Case | Expected result |
   | --- | --- |
   | `Paris` | Exactly 2 `PUBLIC` listings |
   | `paris` | Same 2 listings as `Paris` |
   | Unknown city | 0 listings |
   | Empty city | 0 listings |
   | Supplied payload | 0 listings |
   | Publication boundary | No `UNPUBLISHED` listing, no `FLAG{...}` reference |

1. Ask Blue to restart the app on the patched code and verify:

   ```text
   Blue, restart the app: run kill -- -"$(cat .workshop-app.pid)", then
   rm -f .workshop-app.pid, then npm run workshop:app. Run npm run verify.
   Show me the result and wait for my decision that the `green` phase is ready.
   Only after I make that decision, run npm run phase -- green.
   ```

   ✅ `npm run verify` prints six `PASS:` lines, then `Phase green recorded.`
1. Ask Blue to run the regression evidence, then ask Red to replay only the supplied payload:

   ```text
   Blue, run npm run regressions. Then Red, run npm run exploit once and show
   me the result. Do not use any other payload.
   ```

   ✅ Regressions print `PASS: participant-selected regression matrix preserved the public-listing boundary.`
   ✅ Red's `npm run exploit` **fails** with `tautology should return every listing` and prints no `CAPTURED:` line. That failure is the expected result.
1. Ask Blue to commit and push:

   ```text
   Blue, show me git diff. After I explicitly confirm, commit only the approved
   patch and its tests, and push main.
   ```

   ✅ The diff touches only `buildCityFilter` (plus tests, if any); `git push` succeeds.
1. Open `https://github.com/<handle>/github-universe26-ctf/security/code-scanning`. Record **CodeQL pending** while the scan is queued or running, and **CodeQL clean** only after the completed scan shows no SQL injection alert. Passing local regressions do not make CodeQL clean.
1. After reviewing the evidence, decide that the final phase is ready, then ask Squad to publish it:

   ```text
   Squad, run npm run phase -- blue.
   ```

**Expected evidence:**

- `Phase green recorded.` and `Phase blue recorded.`
- A `CAPTURE COMPLETE` recap listing your phases and captured flag. The recap is authoritative even if the scoreboard is offline.
- CodeQL status recorded as pending or clean → go to the [Review](x-review.md).

<details>
<summary>Having trouble? 🤷</summary><br/>

- **`participant approval is missing`:** return to Step 3 and ask Squad to run `npm run approve -- parameter-binding`.
- **`BLOCKED: application is not running`:** rerun the restart prompt in item 3.
- **`city search should be case-insensitive`:** the patch dropped `COLLATE NOCASE`. Ask Green for the approved line from Step 3.
- **`the approved correction must be committed and pushed on main`:** `app/src/search-query.js` has uncommitted changes or `main` is not pushed. Ask Blue to commit and push, then rerun regressions.
- **`git push` rejected:** confirm you are in your participant repository; pushing to a shared `main` is unsupported.
- **Payload still returns listings:** the old server is still running. Rerun the restart prompt.
- **Scoreboard offline:** a missing CodeQL-clean update on the board never blocks the end of the round.

</details>
