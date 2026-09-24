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

1. Open `https://github.com/<handle>/github-universe26-ctf/security/code-scanning` (replace `<handle>` with your GitHub username). Record one status:
   - **Alert present** → use it as your CodeQL evidence.
   - **CodeQL pending** (scan queued or running, or no result yet) → use the facilitator's reference finding. Never record CodeQL clean before a scan completes.
1. Send:

   ```text
   Ask Green to explain the CodeQL finding in terms of source, flow, and sink,
   quoting the real files it passes through. Explain why the neighbouring
   queries are safe and this one is not. Do not propose a correction yet.
   ```

   ✅ Green names the request `city` source, every file on the CodeQL flow, and the SQL execution sink, each with a file path you can open.
1. State in one sentence why the CodeQL flow and Red's runtime output describe the same defect.
1. Send:

   ```text
   Squad, ask Mentor to run the understanding check now. Mentor must ask the
   questions one at a time in this conversation, never reveal the expected
   answer, and only grade the answers I actually choose.
   ```

1. Answer each question in your own words. A wrong answer → Mentor re-explains and asks again.
   ✅ Mentor's `npm run checkpoint` grading prints `PASS: understanding confirmed across …`.
1. Ask Squad to publish the phase:

   ```text
   Squad, run `npm run phase -- purple`.
   ```

**Expected evidence:**

- CodeQL status recorded: alert present, or **CodeQL pending** with the facilitator's reference finding.
- `PASS: understanding confirmed across …` from Mentor's checkpoint.
- `npm run phase -- purple` prints `Phase purple recorded.` → go to [Step 3](3-step.md).

<details>
<summary>Having trouble? 🤷</summary><br/>

- **Where does the source start?** The request's `city` value.
- **Where is the sink?** Find where the SQL statement is prepared and executed, then find the helper that composed the string it received.
- **Why are the other filters safe?** Compare how each one passes its value into SQL.
- **`Missing purple evidence. Complete npm run checkpoint first.`** Mentor has not recorded a passing grade yet. Rerun the Mentor prompt.
- **Stuck on a question?** Mentor will not confirm answers. Ask Red or Green to walk back through their evidence.

</details>
