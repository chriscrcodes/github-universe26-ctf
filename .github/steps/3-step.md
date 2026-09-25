## Step 3: Approve and verify Green's correction

**Hands-on target: minutes 24–30.**

**Objective:** Approve the exact parameter-binding patch, let Green implement
and verify it, then publish `green` after Mentor's checkpoint.

**Requires:** `purple` phase published (Step 2). The approval command refuses to run without it.

### 📖 Theory: Keep code and data separate

| Option | Effect | Limitation |
| --- | --- | --- |
| Blacklist suspicious text | May stop one known string | Incomplete; still mixes request data with SQL |
| Allow only known cities | Business rule | Does not secure every value reaching SQL |
| Bind `city` as a parameter | Separates SQL syntax from request data | Fixes the root cause |

### ⌨️ Activity: Compare and approve

**What to do:**

1. **🔀 Handoff · You → Squad → 🟢 Green.** Ask Green to compare approaches and show a proposed diff; Green does not edit the files. Send:

   ```text
   Compare blacklist, allowlist, and parameter binding. Show the exact diff,
   explain the trade-offs, and wait for my explicit approval before making
   any changes.
   ```

1. Check the diff. Approve only if **all** are true:
   - It changes only `buildCityFilter` in `app/src/search-query.js`.
   - The new line is:

     ```js
     return { clause: "city = ? COLLATE NOCASE", parameters: [city] };
     ```

   - `buildMaxPriceFilter`, `buildNameFilter`, `selectPublicListingById`, `summarizePartnerRates`, and `app/src/input-normalizer.js` are untouched.
   - The `listingStatus = 'PUBLIC'` filter is unchanged.

   Any check fails → reject and ask Green for a narrower diff. Keep `COLLATE NOCASE`:
   verification requires `paris` and `Paris` to return the same listings.
1. Type exactly: **I explicitly approve this exact patch**
1. Squad records the approval with `npm run approve -- parameter-binding`.
   ✅ Output: `APPROVED: parameter binding may be applied by Green.`
1. Only after approval, Green implements that exact diff. If it needs to change,
   Green must show the revised diff and wait for new approval.
1. Confirm the intended behavior matrix with Mentor:

   | Case | Expected result |
   | --- | --- |
   | `Paris` and `paris` | Same 2 public listings |
   | Unknown city and empty city | No listings |
   | Supplied payload | No listings |
   | Publication boundary | No unpublished listing or captured flag |

1. Green restarts the app and runs `npm run verify`. Red retests only the supplied
   payload. The exploit must fail because the payload is blocked, not because the
   app is unavailable. Red returns the evidence to Mentor before Green publication.
1. Answer Mentor's three Green checkpoint questions, one at a time. After the
   checkpoint passes, confirm: **The Green phase is ready.** Squad runs
   `npm run phase -- green`. No commit or push happens in this step.

**Expected evidence:**

- A displayed diff that passes all four checks.
- `APPROVED: parameter binding may be applied by Green.` before implementation.
- Verification passes, Red confirms the blocked payload, and Mentor's checkpoint passes.
- `Phase green recorded.` → Continue to Step 4 → [4-step.md](4-step.md).

<details>
<summary>Having trouble? 🤷</summary><br/>

- **Green describes a fix but shows no diff:** do not approve. Ask for the exact diff.
- **`Approval not recorded: Complete and publish the purple CodeQL phase…`** Return to Step 2 and publish `purple`.
- **Green proposes an allowlist or hardens the normalization helper:** reject. Both leave request text on the SQL construction path.
- **Unsure the patch is enough:** ask Green whether request text still constructs SQL after the change. The answer must be no.

</details>
