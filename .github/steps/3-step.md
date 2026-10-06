---
title: Approve a Correction
description: "Ask Green for a minimal correction and choose the approved scope."
---

## Step 3: Choose the correction

Target: start of minutes 20-28. Requires your reviewed CodeQL finding (`purple`).

### 📖 Theory: Keep query syntax separate from values

Parameter binding passes request values separately from the SQL statement.
Filtering strings or limiting known cities is not equivalent. Preserve the
PUBLIC boundary, case-insensitive search, and existing safe filters.

### ⌨️ Activity: Request advice, then decide

1. Ask Green for an exact minimal diff against the actual alert location and
   current code. Green should explain the correction and test implications,
   not edit the application.
1. Review the scope. Reject unrelated changes or a correction that relies
   only on sanitizing input. Ask for explanations only where you need them.
1. Give explicit approval of the displayed diff. For example:
   "I explicitly approve this exact patch".
1. Record your approval with `npm run approve -- parameter-binding`.
   Then ask Blue to implement it. Green never edits code.

The expected output is `APPROVED: parameter binding may be applied by Blue.`
Continue to [Step 4](4-step.md). The `green` milestone is published only after
Blue implements the correction and verification passes.

<details>
<summary>Having trouble? 🤷</summary>

- Ask Green to distinguish a business-rule allowlist from database parameter binding.
- Ask whether user-controlled text can still alter query syntax after the patch.
- Use the actual alert path; the exercise does not require one hard-coded line.
- If the proposed diff changes after approval, review and approve the new scope.

</details>
