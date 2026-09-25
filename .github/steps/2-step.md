## Step 2: Trace the CodeQL flow and pass Mentor's check

**Hands-on target: minutes 17–24.**

**Objective:** Connect the CodeQL flow (source → flow → sink) to Red's runtime evidence, pass Mentor's understanding check, and publish the `purple` phase.

**Requires:** `red` phase published (Step 1).

### 📖 Theory: Source, flow, and sink

- **Source:** where untrusted data enters.
- **Flow:** the files and functions that carry or transform it.
- **Sink:** the security-sensitive operation that consumes it.

Input normalization that strips a few characters is hygiene, not a SQL defense.

### ⌨️ Activity: Connect the CodeQL flow to Red's evidence

Stay in the same conversation and answer Mentor. Squad chains the steps below
without asking for permission.

1. Squad runs `npm run codeql:review -- --phase=purple` and Mentor gives you the
   actual CodeQL report link, analysis ID and baseline commit SHA. The report
   lives at `https://github.com/<handle>/github-universe26-ctf/security/code-scanning`;
   Squad resolves the repository from your `origin`, not a guessed username.
   **CodeQL pending** means wait, not pass. A reference finding cannot replace
   the analysis of your baseline commit.
1. **Your decision — read the report or accept an override.** Open the SQL
   injection alert on `main` and tell Mentor you read it. Only then does Squad
   record the reading with `npm run codeql:review -- --phase=purple --confirm --analysis=ID --commit=SHA`,
   using the displayed values. If Code Scanning is inaccessible (for example,
   GitHub returns `403`), Mentor offers an override; accept it with a short
   reason and Squad records:

   ```sh
   npm run codeql:review -- --phase=purple --override --reason="GitHub returned 403 for Code Scanning; participant accepts an unverified review."
   ```

   The override is marked **unverified**, not clean (it is not **CodeQL clean**).
   Do not use it when a readable report contains a finding that needs review.
1. Green explains the finding in every case, including after an override:
   the request `city` source, every file on the CodeQL flow, and the SQL
   execution sink, each with a file path you can open. Green does not propose
   a patch yet. Compare it with Red's runtime output: both describe the same defect.
1. **Your decision — Mentor's Purple checkpoint.** Mentor presents one
   deterministic multiple-choice question at a time. Reply with only the option
   ID (`a`, `b`, or `c`). After a wrong choice, Mentor gives the correct option
   and explanation, then moves on without retrying it.
   ✅ Mentor's checkpoint prints `PASS: purple checkpoint confirmed across …`;
   any coached questions are recorded in the receipt.
1. **Your decision — phase readiness.** Mentor asks whether Purple is ready.
   Answer yes and Squad runs `npm run phase -- purple`.

<details>
<summary>If Mentor stalls</summary><br/>

Send `Mentor, continue.` To trigger a specific action, ask Squad:

```text
Ask Green to help me understand this CodeQL alert. Do not propose a fix yet.
```

```text
Ask Squad to continue with Mentor's Purple checkpoint.
```

</details>

**Expected evidence:**

- Either a human-reviewed open SQL injection alert on the baseline SHA, or an explicit Purple override marked unverified.
- `PASS: purple checkpoint confirmed across …` from Mentor's checkpoint.
- `npm run phase -- purple` prints `Phase purple recorded.` → go to [Step 3](3-step.md).

<details>
<summary>Having trouble? 🤷</summary><br/>

- **Where does the source start?** The request's `city` value.
- **No baseline analysis:** ask Squad to trigger the existing Security verification
   workflow on `main` before any correction. Its initial runtime verification may
   fail intentionally; the CodeQL analysis itself must complete successfully.
- **CodeQL access denied:** if the report cannot be read, use the explicit Purple override above. It is not a clean result.
- **Where is the sink?** Find where the SQL statement is prepared and executed, then find the helper that composed the string it received.
- **Why are the other filters safe?** Compare how each one passes its value into SQL.
- **`Missing purple evidence. Complete npm run checkpoint first.`** Mentor has not recorded a passing grade yet. Send `Mentor, continue.`
- **Need help with a question?** Mentor checks each answer and gives the correct option after a miss; no repeat loop is required.
- **Green did not explain the finding after an override:** send `Mentor, continue.` The explanation is part of Purple even without a readable report.

</details>
