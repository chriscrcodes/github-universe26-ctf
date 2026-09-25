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

**What to do:**

1. Mentor asks Squad to run `npm run codeql:review -- --phase=purple` and gives
   you the actual CodeQL report link, analysis ID and baseline commit SHA.
   The report lives at `https://github.com/<handle>/github-universe26-ctf/security/code-scanning`;
   Squad resolves the repository from your `origin`, not a guessed username.
1. Open the SQL injection alert on `main`. Describe the entry point, data flow
   and SQL execution location to Mentor. **CodeQL pending** means wait, not pass.
   A reference finding cannot replace the analysis of your baseline commit.
   If Code Scanning is inaccessible (for example, GitHub returns `403`) and you
   accept continuing without a verified report, tell Mentor. Squad records an
   explicit override for this commit with:

   ```sh
   npm run codeql:review -- --phase=purple --override --reason="GitHub returned 403 for Code Scanning; participant accepts an unverified review."
   ```

   The override is marked **unverified**, not clean (it is not **CodeQL clean**). Do not use it
   when a readable report contains a finding that needs review.

1. **🔀 Handoff · You → Squad → 🟢 Green.** Ask Green to explain the finding; Green does not propose a patch yet. Send:

   ```text
   Ask Green to help me understand this CodeQL alert. Do not propose a fix yet.
   ```

   ✅ Green names the request `city` source, every file on the CodeQL flow, and the SQL execution sink, each with a file path you can open.
1. State in one sentence why the CodeQL flow and Red's runtime output describe the same defect.
1. Confirm to Mentor that you read this report. Only then does Squad record
   the reading with `npm run codeql:review -- --phase=purple --confirm --analysis=ID --commit=SHA`,
   replacing the placeholders with the displayed values. You do not run the command.

1. **🔀 Handoff · You → Squad → 🟣 Mentor.** Mentor quizzes you with a deterministic
   multiple-choice check. Send:

   ```text
   Ask Squad to continue with Mentor's Purple checkpoint.
   ```

1. Mentor presents one deterministic multiple-choice question at a time. Reply with
   only the displayed option ID (`a`, `b`, or `c`), not free-form prose. Mentor
   checks each answer immediately; after a wrong choice, Mentor gives the correct
   option and explanation, then moves to the next question without retrying it.
   ✅ Mentor's checkpoint prints `PASS: purple checkpoint confirmed across …`;
   any coached questions are recorded in the receipt.

1. **🔀 Return · Mentor PASS → You → Squad.** After reviewing the evidence and passing the check, explicitly authorize Squad to publish `purple`:

   ```text
   I read the CodeQL report and understand the finding. The Purple phase is ready.
   ```

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
- **`Missing purple evidence. Complete npm run checkpoint first.`** Mentor has not recorded a passing grade yet. Rerun the Mentor prompt.
- **Need help with a question?** Mentor checks each answer and gives the correct option after a miss; no repeat loop is required.

</details>
