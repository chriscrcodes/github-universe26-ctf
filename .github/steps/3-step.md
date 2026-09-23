## Step 3: Approve the smallest safe correction

**Hands-on target: minutes 24–30.** Green may propose a patch, but only you
approve it. Approval must be explicit and based on the displayed diff.

### 📖 Theory: Keep code and data separate

| Option | Value | Limitation |
| --- | --- | --- |
| Blacklist suspicious text | May stop one known string | Incomplete and still mixes request data with SQL |
| Allow only known cities | Possible business rule | Does not secure every value reaching SQL |
| Bind `city` as a parameter | Separates SQL syntax from request data | Addresses the root cause |

Business validation may be useful, but it does not replace parameter binding at
the database boundary.

### ⌨️ Activity: Compare and approve

1. Ask Green to compare the options, show the exact diff, and wait:

   ```text
   Compare blacklist, allowlist, and parameter binding. Show the exact diff,
   explain the trade-offs, and wait for my explicit approval before making
   any changes.
   ```

1. Confirm that normal `Paris` behavior and the `PUBLIC` boundary remain
   unchanged, and that the flag is no longer reachable.
1. The patch must change only the city filter that builds its clause by string
   interpolation. The intended shape is a bound parameter:

   ```js
   return { clause: "city = ?", parameters: [city] };
   ```

1. Ask Green to confirm that the price, name, identifier, and partner-summary
   queries are already parameterized and must stay untouched. A patch that
   rewrites them is larger than the approved scope.

1. Say **“I explicitly approve this exact patch”** only after reviewing the
   proposed change, then record that gate:

   Ask Squad to record this approval with the workshop approval command. You
   do not need to type the npm command yourself.

1. Ask Green to hand the exact approved patch to Blue. Green never edits code.
1. Continue to Step 4. The Green phase is published only after Blue has applied
   the approved patch and the deterministic verification passes.

<details>
<summary>Having trouble? 🤷</summary><br/>

- Green must show the diff but never edit it; do not approve a vague description.
- Ask whether request text still constructs SQL after the change.
- A city allowlist is not a replacement for parameter binding.
- Hardening the normalization helper is not a fix: it leaves request text on
  the SQL construction path.
- If verification cannot reach the app, restart the corrected local server.

</details>
