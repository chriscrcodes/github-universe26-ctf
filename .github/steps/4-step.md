---
title: Deliver and Verify the Correction
description: "Blue implements the approved patch and the participant confirms the same CodeQL alert is fixed."
---

## Step 4: Deliver the correction and confirm fixed

Target: remainder of minutes 20-28. Requires recorded participant approval.

### 📖 Theory: Local tests and hosted scans answer different questions

Local checks test behavior. A completed CodeQL analysis describes the pushed
commit. The original alert must become fixed, not dismissed or missing.
Neither a successful push nor an empty alert page while a scan is pending
proves that result.

### ⌨️ Activity: Implement, deliver, review

1. Ask Blue to apply only Green's approved patch and its agreed tests.
1. Restart the app with `npm run workshop:restart`. Ask Blue to run
   `npm run verify` against the corrected code. Review the result and publish
   `npm run phase -- green` only after it passes.
1. Review the diff and explicitly authorize Blue to commit the correction and
   push `main`. Then run `npm run regressions` and publish `npm run phase -- blue`.
   Regressions require the corrected commit already pushed; they are not an
   initial attack-demonstration step.
   The `blue` milestone confirms delivery, not hosted CodeQL completion.
1. Open the original finding in Security, Code scanning. Keep reporting
   CodeQL pending until analysis of that exact pushed commit completes.
1. Inspect `npm run codeql:review -- fixed`. After reading the report, run:

   ```bash
   npm run codeql:review -- fixed --reviewed
   npm run phase -- codeql
   ```

CodeQL clean is recorded only after the original finding is fixed and the
successful current analyses report no remaining findings. The final publisher
rechecks GitHub evidence rather than relying on an old receipt. Board updates
are best effort; local evidence is retained if the board is offline.

Continue to the [Review](x-review.md).

<details>
<summary>Having trouble? 🤷</summary>

- If verification differs from the diff, confirm the app restarted from the corrected code.
- If `main` is not pushed, ask Blue to show the branch, remote commit, and scoped diff.
- If CodeQL remains open or fails, report that result and ask Red to inspect it.
- Missing or dismissed alerts do not count as fixed. Do not change scan settings
  to hide a finding or substitute another repository's result.
- When the timer ends before GitHub finishes, keep the workshop pending and
  resume the evidence review later. Do not publish final completion.

</details>
