## Step 2: Green explains the CodeQL flow

**Hands-on target: minutes 17–24.** Runtime evidence shows impact. CodeQL
independently explains how request data reaches SQL execution.

### 📖 Theory: Source, flow, and sink

- **Source:** where untrusted data enters.
- **Flow:** how the application carries or transforms it.
- **Sink:** the security-sensitive operation that consumes it.

Static and runtime evidence are stronger when they describe the same defect
from different directions.

### ⌨️ Activity: Connect CodeQL to Red's evidence

1. Ask Squad to involve Green without discussing a fix yet:

   ```text
   Ask Green to explain the CodeQL finding in terms of source, flow, and sink,
   linking each claim to app/src/hotels.js. Do not propose a correction yet.
   ```

1. Have Green identify the untrusted `city` source, its flow into the SQL
   statement, and the execution sink.
1. Explain why the CodeQL result and Red's runtime output describe the same
   defect.
1. Ask Green to run the deterministic understanding check and publish the
   `purple` phase after your answers are correct. You do not need to type the
   npm commands yourself.

5. If CodeQL is pending, say so explicitly and use the facilitator's reference
   finding as fallback evidence. Do not claim a clean result before a scan
   completes.

<details>
<summary>Having trouble? 🤷</summary><br/>

- The request's `city` value is the untrusted input.
- Find where the SQL statement is prepared and executed.
- Ask how `city` becomes part of that statement.
- A delayed scan is **CodeQL pending**, not CodeQL clean; keep the status in
  your evidence notes.

</details>
