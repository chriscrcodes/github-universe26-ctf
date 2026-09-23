## Step 2: Prove that you understand the capture

**Hands-on target: minutes 17–24.** Runtime evidence shows impact. CodeQL
independently explains how request data reaches SQL execution. Then Mentor
checks that *you*, not the agents, can explain it.

### 📖 Theory: Source, flow, and sink

- **Source:** where untrusted data enters.
- **Flow:** how the application carries or transforms it.
- **Sink:** the security-sensitive operation that consumes it.

Static and runtime evidence are stronger when they describe the same defect
from different directions. Beware of code that *looks* defensive: input
normalization that strips a few characters is hygiene, not a SQL defence.

### 🔎 Find the CodeQL result

Open **Security → Code scanning** in your participant repository:
`https://github.com/<handle>/github-universe26-ctf/security/code-scanning`
(replace `<handle>` with your GitHub username). Public visibility alone does
not start CodeQL scans. This repository includes an advanced CodeQL Actions
workflow at `.github/workflows/security.yml`; GitHub runs it when Actions are
enabled. If that workflow is absent or disabled in your copy, a repository
maintainer must enable CodeQL default setup in **Settings → Advanced Security**
or restore the workflow. Do not enable default setup on top of an active
advanced setup.

### ⌨️ Activity: Connect CodeQL to Red's evidence, then pass Mentor's check

1. Ask Squad to involve Green without discussing a fix yet:

   ```text
   Ask Green to explain the CodeQL finding in terms of source, flow, and sink,
   quoting the real files it passes through. Explain why the neighbouring
   queries are safe and this one is not. Do not propose a correction yet.
   ```

1. Have Green identify the untrusted `city` source, every file it flows
   through, and the execution sink.
1. Explain why the CodeQL result and Red's runtime output describe the same
   defect.
1. Ask Squad to hand over to Mentor for the understanding check:

   ```text
   Squad, ask Mentor to run the understanding check now. Mentor must ask the
   questions one at a time in this conversation, never reveal the expected
   answer, and only grade the answers I actually choose.
   ```

1. Answer Mentor's questions in your own words. If you are wrong, Mentor
   re-explains the concept and asks again. When your answers are graded as
   correct, ask Squad to publish the `purple` phase. You do not need to type
   the npm commands yourself.
1. If CodeQL is pending, say so explicitly and use the facilitator's reference
   finding as fallback evidence. Do not claim a clean result before a scan
   completes.
1. Continue to [Step 3](3-step.md) once the `purple` phase is published.

<details>
<summary>Having trouble? 🤷</summary><br/>

- The request's `city` value is the untrusted input.
- Find where the SQL statement is prepared and executed, and which helper
  composed the string it received.
- Ask how `city` becomes part of that statement, and why the other filters
  behave differently.
- A delayed scan is **CodeQL pending**, not CodeQL clean; keep the status in
  your evidence notes.
- Mentor will not confirm an answer for you. If you are stuck, ask Red or Green
  to walk you back through their evidence.

</details>
