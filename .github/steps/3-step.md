---
title: Approve a Correction
description: "Ask Green for a minimal correction and choose the approved scope."
---

## Step 3: Choose the correction

Requires your reviewed CodeQL finding (`purple`).

### 📖 Theory: Keep query syntax separate from values

Parameter binding passes request values separately from the SQL statement.
Filtering strings or limiting known cities is not equivalent. Preserve the
PUBLIC boundary, case-insensitive search, and existing safe filters.

With binding, the statement contains a placeholder such as `?`; the city is
supplied separately as a parameter when the statement executes. Characters in
that value remain data rather than becoming operators, quotes or comments in
the statement. `COLLATE NOCASE` can still provide case-insensitive matching.

The repository already provides `buildCityFilter` in
[the query helpers](../../app/src/search-query.js). Ask Green whether reusing
that helper fixes the reported flow while retaining the other filters. A
small patch is useful because you can explain its scope and verify its effects,
not because fewer changed lines alone prove safety.

| Proposal | Why it is or is not the workshop correction |
| --- | --- |
| Bind the city as a value | Separates input data from SQL syntax at execution |
| Reject a few suspicious characters | Does not establish that separation |
| Accept only a few known cities | Changes allowed behavior without fixing query construction |
| Hide unpublished rows in the browser | Leaves those records exposed in the API response |

### ⌨️ Activity: Request advice, then decide

1. Ask Green for an exact minimal diff against the actual alert location and
   current code. Green should explain the correction and test implications,
   not edit the application.
   Use the same Squad conversation:

   ```text
   Green, propose the smallest parameter-binding patch for this CodeQL finding.
   Preserve normal search and existing safe filters. Explain why this input
   becomes data rather than SQL syntax. Show the exact diff; do not edit.
   ```

1. Review the scope. Reject unrelated changes or a correction that relies
   only on sanitizing input. Ask for explanations only where you need them.
   Check whether the diff fixes the city filter while preserving the `PUBLIC`
   predicate, case-insensitive comparison, name and price filters and sort
   allowlist. Adding a new architecture or changing unrelated endpoints is
   outside the agreed scope.

   ```text
   Green, walk me through the proposed diff. Which line changes the city from
   SQL syntax into a bound value? Which existing behavior stays unchanged?
   Name the local checks that would detect a broken normal search or continued
   unpublished-data exposure. Do not apply the patch.
   ```

1. Give explicit approval of the displayed diff. For example:
   "I explicitly approve this exact patch".
   First explain why the patch prevents the observed predicate bypass.
   Once you understand it, you can make the boundary explicit:

   ```text
   I explicitly approve this exact patch and the displayed test scope.
   Blue may apply it; Green must not edit. Ask me again if the diff must change.
   This approval does not authorize a commit or push.
   ```

1. Record your approval with `npm run approve -- parameter-binding`.
   Then ask Blue to implement it. Green never edits code.

   Conversation approval identifies the diff you reviewed. The command records
   the approved strategy for local progression; it does not inspect or identify
   the exact diff and is not a substitute for your review. Keep both steps.
   Approval does not mean the correction has been applied or verified.

### Checkpoint: A reasoned choice

You should be able to finish: "The input previously changed the query because
it was inserted into its text. With this patch, ____ stays fixed and ____ is
passed separately. The public-listing rule remains ____. I will verify ____."
Use the actual proposed code to fill the blanks, not the agent's confidence.

The expected output is `APPROVED: parameter binding may be applied by Blue.`
Continue to [Step 4](4-step.md). The `green` milestone is published only after
Blue implements the correction and verification passes.

<details>
<summary>Having trouble? 🤷</summary>

- Ask Green to distinguish a business-rule allowlist from database parameter binding.
- Ask whether user-controlled text can still alter query syntax after the patch.
- Use the actual alert path; the exercise does not require one hard-coded line.
- If the proposed diff changes after approval, review and approve the new scope.

If the proposal relies on filtering instead of binding:

```text
Green, compare this proposal with parameter binding at database execution.
Would arbitrary city text still become SQL syntax? Explain the difference and
propose a narrower correction using existing helpers. Do not edit any files.
```

</details>
