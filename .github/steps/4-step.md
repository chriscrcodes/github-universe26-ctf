## Step 4: Blue applies, tests, and publishes

**Hands-on target: minutes 30–40.** Blue acts only on the patch you approved:
apply it, run local regressions, commit, and push it to your participant
repository. The final five minutes are for debrief.

### 📖 Theory: Security fixes need regression and scan evidence

A strong verification matrix includes a normal case, negative cases, the
original attack, and the protected publication boundary. Local tests provide
immediate evidence; CodeQL may remain pending until its scan completes.

### ⌨️ Activity: Verify like a defender

1. Ask Blue to challenge the matrix before running commands:

   ```text
   Blue, apply only the approved patch. Propose a matrix covering the normal
   case, negative cases, the payload, and the publication boundary. Then wait
   for my approval before testing, committing, and pushing.
   ```

1. Confirm these expected results:

   | Case | Expected result |
   | --- | --- |
   | `Paris` | Exactly 2 public listings |
   | Unknown city | No listings |
   | Empty city | No listings |
   | Supplied payload | No listings |
   | Publication boundary | No `UNPUBLISHED` listing |
   | Flag | No `FLAG{...}` reference is reachable |

1. After Blue applies only Green's approved patch, restart the application and
   verify that specific remediation:

   Ask Blue to run the fixed behavior verification and publish the `green`
   phase after it passes. You do not need to type those npm commands yourself.

1. Ask Blue to inspect `git diff`, then commit and push the approved patch.
   You own the final confirmation:

   Ask Blue to inspect the diff, commit the approved patch, and push `main`.

1. Run the regression evidence only after `main` is pushed, then ask Red to
   replay only the supplied payload:

   Ask Blue to run the regression evidence after `main` is pushed, then ask Red
   to replay only the supplied payload.

1. Record both scan states accurately: **CodeQL pending** while the new scan is
   queued/running, and **CodeQL clean** only after the completed scan reports no
   relevant alert. Local regressions passing does not by itself mean CodeQL is
   clean.
1. Ask Squad to publish the `blue` phase after the evidence is complete. Squad
   then prints your local capture recap: the phases you completed and the flag
   you captured. That recap is authoritative even if the scoreboard is offline.
1. Continue to the [Review](x-review.md) once the `blue` phase is published.

<details>
<summary>Having trouble? 🤷</summary><br/>

- If verification reports missing approval, return to Step 3 and ask Squad to
  record the approval again.
- If the payload still returns data, confirm the corrected server is running.
- If `git push` is rejected, verify that this is your participant repository;
  shared `main` is unsupported.
- Never report CodeQL clean while the scan is pending.
- The scoreboard updating the CodeQL-clean state is a bonus; a missing or
  offline board never blocks the end of the round.
- Keep the commit limited to the approved patch and its tests.

</details>
