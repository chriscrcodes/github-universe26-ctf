## Step 3: Approve the smallest safe correction

**Hands-on target: minutes 24–30.**

**Objective:** Approve, in exact words, a parameter-binding patch to the city filter only, and record that approval.

**Requires:** `purple` phase published (Step 2). The approval command refuses to run without it.

### 📖 Theory: Keep code and data separate

| Option | Effect | Limitation |
| --- | --- | --- |
| Blacklist suspicious text | May stop one known string | Incomplete; still mixes request data with SQL |
| Allow only known cities | Business rule | Does not secure every value reaching SQL |
| Bind `city` as a parameter | Separates SQL syntax from request data | Fixes the root cause |

### ⌨️ Activity: Compare and approve

**What to do:**

1. Ask Green to compare the options, show the exact diff, and wait:

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

   Any check fails → reject and ask Green for a narrower diff. Keep `COLLATE NOCASE`: Step 4 verification requires `paris` and `Paris` to return the same listings.
1. Type exactly: **I explicitly approve this exact patch**
1. Ask Squad to record the approval:

   ```text
   Squad, run `npm run approve -- parameter-binding`.
   ```

   ✅ Output: `APPROVED: parameter binding may be applied by Blue.`
1. Ask Green to hand the exact approved patch to Blue. Green never edits code.

**Expected evidence:**

- A displayed diff that passes all four checks.
- `APPROVED: parameter binding may be applied by Blue.`
- Green confirms the handoff to Blue → Continue to Step 4 → [4-step.md](4-step.md). No phase is published in this step; `green` is published in Step 4 after verification passes.

<details>
<summary>Having trouble? 🤷</summary><br/>

- **Green describes a fix but shows no diff:** do not approve. Ask for the exact diff.
- **`Approval not recorded: Complete and publish the purple CodeQL phase…`** Return to Step 2 and publish `purple`.
- **Green proposes an allowlist or hardens the normalization helper:** reject. Both leave request text on the SQL construction path.
- **Unsure the patch is enough:** ask Green whether request text still constructs SQL after the change. The answer must be no.

</details>
