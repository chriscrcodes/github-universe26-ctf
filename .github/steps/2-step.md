---
title: Review CodeQL Evidence
description: "Explain the delivered code and attest to reviewing the exact commit while CodeQL analysis runs asynchronously."
---

**Workshop steps:** ✅ [1. Baseline](1-step.md) → 🎯 **2. Exposure** → ⏳ [3. Correction scope](3-step.md) → ⏳ [4. Delivery](4-step.md) → ⏳ [Review](x-review.md) · Tasks 06–08 of 15

## Step 2: Explain the exposure and review CodeQL (Tasks 06 to 08)

### At a glance

* Current phase: `2. purple`, CodeQL review
* Roles: Red reviews the security finding; Purple reviews the checkpoint
* Publish after Purple approves: `npm run phase -- purple`
* Terminals: Continue in the existing 🤖 Terminal 2 Squad conversation. Use 🖥️ Terminal 1 only for commands labeled there.

### Theory: A scan is evidence, not a verdict on every behavior

* **How CodeQL works:** CodeQL traces untrusted data from its **Source** through program **Flow** to a sensitive **Sink** (`js/sql-injection`).
* **The security boundary:** Only listings with `listingStatus = 'PUBLIC'` may appear in search results. Inserting raw `city` text into SQL syntax lets a caller bypass that filter.
* **Normalization is not parameter binding:** Trimming whitespace or rejecting a few fragments does not stop input from becoming SQL syntax.

| Term | Meaning in this workshop |
| --- | --- |
| **Source** | The `city` query parameter received by the search endpoint |
| **Flow** | Normalization, city-filter construction, and assembly of the listing query |
| **Sink** | The database statement prepared and executed with that query |
| **Boundary** | Only records with `listingStatus = 'PUBLIC'` should appear in public search |
| **Evidence** | Your observed response, source review, and participant attestation for the exact delivered commit |

---

### Activity: Explain while the scan runs (Tasks 06 to 08)

6. **[Task 06] Observe the injection in the browser and check GitHub Code Scanning (🌐 Browser)**

   > 🌐 **BROWSER: Web Interface (<http://localhost:3000>)**

   * **Action:** Enter the workshop's demonstration input in the city-search field:

   ```text
   ' OR 1=1 --
   ```

   * **Expected observation:** **24 listings** appear, including **4 `UNPUBLISHED` records** (use only this supplied input against the local synthetic dataset).

   ![Supplied demonstration input returns twenty-four stays, including unpublished records outlined in red.](../images/sqli-demo/2-injected-search.png)

   *Compare the observed records with the public-listing boundary.*

   > 🌐 **BROWSER: GitHub Repository (`Security > Code scanning`)**

   * **Action:** Open **Security > Code scanning** in your GitHub repository to check if the scan on `feature/city-search` has finished.
   * **Note:** CodeQL runs asynchronously—continue immediately even if the scan is still queued or pending.

7. **[Task 07] Ask Red to explain the flow and route the checkpoint to Purple (🤖 Terminal 2)**

   * **Action:** Continue in 🤖 Terminal 2, using the Squad conversation opened in Step 1. Do not start a new conversation. Ask **🔴 Red** to trace the vulnerability and route the Step 2 checkpoint to **🟣 Purple**:

   > 🤖 **TERMINAL 2: Squad Conversation (Agent: 🔴 Red ➔ 🟣 Purple)**

   ```text
   Red, trace the supplied city input through my exact delivered source to SQL
   execution and explain how the supplied demonstration bypassed the PUBLIC
   filter. If the matching CodeQL alert is available, cite its actual location
   and flow; otherwise, explain from source and runtime evidence (24 listings
   including 4 UNPUBLISHED) and label CodeQL pending or unavailable. Separate
   observed exposure from potential impact. Do not edit or exploit.
   Answer only; do not offer fixes, a follow-up menu or a findings commit.

   Then preview `npm run codeql:review -- baseline` and
   route the Step 2 checkpoint to Purple with my observed result, source-based
   explanation, exact delivery commit, and CodeQL alert status. Pause until I
   relay Purple's decision. Do not publish a phase.
   ```

8. **[Task 08] Relay Purple's approval, record attestation, and publish Phase 2: `purple` (🤖 Terminal 2)**

   * **Baseline attestation:** Your participant attestation for this exact commit (`npm run codeql:review -- baseline --reviewed`) records that you reviewed the pushed commit. It does not query or wait for CodeQL analysis; `analysisStatus` remains `not-verified`.
   * **Action:** Once **🟣 Purple** approves, paste this prompt to record your attestation and publish `purple`:

   > 🤖 **TERMINAL 2: Squad Conversation (Relay 🟣 Purple Approval & Publish `purple`)**

   ```text
   Purple approves the Step 2 checkpoint. I have reviewed the delivered source
   and local synthetic result for this exact commit. I authorize running
   `npm run codeql:review -- baseline --reviewed` and `npm run phase -- purple`
   now, then stop and wait for Step 3.
   ```

   <details>
   <summary>🖥️ Manual fallback commands (only if you prefer running in Terminal 1)</summary>

   1. Collect the baseline report:

      ```bash
      npm run codeql:review -- baseline
      ```

   2. After reviewing the exact commit, record your attestation:

      ```bash
      npm run codeql:review -- baseline --reviewed
      ```

   3. After Purple approves the checkpoint, publish the phase and confirm the prompt:

      ```bash
      npm run phase -- purple
      ```

   </details>

---

### ✅ Checkpoint: Phase 2 (`purple`) Complete

- [ ] You observed the **24 stays (including 4 `UNPUBLISHED`)** returned by `' OR 1=1 --`.
- [ ] **🔴 Red** traced the **Source ➔ Flow ➔ Sink** in `app/src/hotels.js` (and labeled CodeQL `pending` if still running).
- [ ] **🟣 Purple** approved the checkpoint and **`Phase purple recorded`** appears in the output. *(Note: The final `codeql` milestone still requires a real successful scan on `main` in Step 4C.)*

**Next step:** Continue to [Step 3](3-step.md).

<details>
<summary>Having trouble?</summary>

- Ask Red to explain source, flow, and sink using the report's own file links.
- Compare query syntax with separately bound values. Normalization alone is
  not parameter binding.
- The facilitator checks that `.github/workflows/codeql.yml` is present on
   both target branches, Default Setup is disabled if enabled, and the
   repository has the required language, licensing, runner and permission support.
- If the review reports HTTP 403 or `Resource not accessible by integration`,
  GitHub denied the API request. This does not establish whether an analysis
  exists. Check `gh auth status`; ask the facilitator to confirm the signed-in
  account or integration has Code Scanning read access and that Code Scanning
  is available for the repository under its plan and organization policy.
   Baseline attestation does not query this API, so report the scan as
   unavailable and continue with source-based evidence. Resolve API access when
   actual scan evidence is required for the final `codeql` milestone.
- The review command uses your existing `gh` login. Never paste a token into chat.

For a shorter explanation without asking Red to supply your answer:

```text
Red, explain source, flow and sink using three locations from the current code.
Then ask me one question about the publication boundary and wait for my answer.
Do not answer for me or mark the review complete.
```

If GitHub and the local report disagree:

```text
Red, compare the repository, branch, commit and analysis reported by the review
command with the alert I opened. Identify mismatches and what remains pending.
Do not change the code, scan configuration or alert state.
```

</details>
