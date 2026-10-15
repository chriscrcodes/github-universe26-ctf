---
title: Approve a Correction
description: "Ask Green for a minimal correction and choose the approved scope."
---

**Workshop steps:** ✅ [1. Baseline](1-step.md) → ✅ [2. Exposure](2-step.md) → 🎯 **3. Correction scope** → ⏳ [4. Delivery](4-step.md) → ⏳ [Review](x-review.md) · Tasks 09–10 of 15

## Step 3: Choose the correction (Tasks 09 to 10)

### At a glance

* Current checkpoint: Approve the correction scope. This does not publish a scoreboard phase.
* Roles: Green advises; Purple reviews the scope
* Record your approval: `npm run approve -- parameter-binding`
* Terminals: Continue in the existing 🤖 Terminal 2 Squad conversation. Use 🖥️ Terminal 1 only for commands labeled there.

### Theory: Keep query syntax separate from values

* **Why parameter binding works:** The SQL statement uses a `?` placeholder (`LOWER(city) = LOWER(?)`) while the user's `city` value is passed separately at execution. Quotes, operators, and comments stay literal data.
* **Existing helper available:** [app/src/search-query.js](../../app/src/search-query.js) already provides `buildCityFilter(term)`.
* **Separation of duties:** **🟢 Green** proposes the minimal patch, **🟣 Purple** validates the scope, you approve `parameter-binding`, and **🔵 Blue** applies it in Step 4.

| Proposal | Why it is or is not the workshop correction |
| --- | --- |
| ✅ **Bind the city as a value** | Separates input data from SQL syntax at execution |
| ❌ **Reject a few suspicious characters** | Does not establish separation between data and syntax |
| ❌ **Accept only a few known cities** | Changes allowed behavior without fixing query construction |
| ❌ **Hide unpublished rows in the browser** | Leaves those records exposed in the API response |

---

### Activity: Request advice, then decide (Tasks 09 to 10)

9. **[Task 09] Ask Green for the minimal parameter-binding diff and route to Purple (🤖 Terminal 2)**

   * **Action:** Continue in 🤖 Terminal 2, using the Squad conversation opened in Step 1. Do not start a new conversation. Ask **🟢 Green** to propose the minimal patch (without editing files) and route the checkpoint to **🟣 Purple**:

   > 🤖 **TERMINAL 2: Squad Conversation (Agent: 🟢 Green ➔ 🟣 Purple)**

   ```text
   Green, propose the smallest parameter-binding patch for this CodeQL finding
   while preserving normal search, the PUBLIC predicate, case-insensitive
   comparison, and existing safe filters. Show the exact diff without editing any
   files. Walk me through which line changes the city from SQL syntax into a
   bound value and name the local checks that would detect a broken normal search
   or continued unpublished-data exposure.

   Then route this correction-scope checkpoint to Purple with your exact proposed
   diff and the agreed behavior and tests. Pause until I relay Purple's
   decision. Do not edit files or authorize Blue yet.
   ```

10. **[Task 10] Relay Purple's approval and record `parameter-binding` approval (🤖 Terminal 2)**

    * **Action:** Confirm the diff uses parameter binding (`buildCityFilter`), then relay **🟣 Purple**'s approval and authorize `npm run approve -- parameter-binding`:

    > 🤖 **TERMINAL 2: Squad Conversation (Relay 🟣 Purple Approval & Record `parameter-binding`)**

    ```text
    Purple approves the correction-scope checkpoint. I explicitly approve Green's
    exact parameter-binding patch and the displayed test scope for Blue to apply
    next (Green must not edit). I authorize running
    `npm run approve -- parameter-binding` now to record my approval, then stop
    and wait for Step 4.
    ```

    <details>
    <summary>🖥️ Manual fallback command (only if you prefer running in Terminal 1)</summary>

    ```bash
    npm run approve -- parameter-binding
    ```

    </details>

---

### ✅ Checkpoint: Remediation Scope Approved

- [ ] **🟢 Green** proposed a minimal diff using `buildCityFilter(term)` without editing files.
- [ ] **🟣 Purple** approved the correction scope.
- [ ] **`APPROVED: parameter binding may be applied by Blue.`** appears in the output.

**Next step:** Continue to [Step 4](4-step.md) to verify the fix locally (`green`), merge the PR to `main` (`blue`), and confirm the CodeQL fix (`codeql`).

<details>
<summary>Having trouble?</summary>

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
