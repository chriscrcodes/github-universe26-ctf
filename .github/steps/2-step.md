---
title: Review CodeQL Evidence
description: "Enable Default Setup and ask Red to explain the actual finding and impact."
---

## Step 2: Enable CodeQL and review the finding

Target: minutes 12-20. Requires initial delivery (`red`).

### 📖 Theory: A scan is evidence, not a verdict on every behavior

CodeQL follows untrusted data from its source through program flow to a
sensitive sink. A SQL injection finding concerns request data becoming SQL
syntax. It may threaten the boundary between public and unpublished listings.
Code reading and static evidence explain possible impact; they do not prove
that a particular runtime result was observed.

### ⌨️ Activity: Configure and inspect

1. In your repository, open `Settings/security_analysis`, then
   `CodeQL analysis > Set up > Default`. Confirm JavaScript/TypeScript and
   enable analysis. UI wording may vary by account.
1. Open Security, Code scanning. Wait for an analysis of your delivered `main`
   commit. Default Setup is managed by GitHub; no custom security workflow is required.
1. Ask Red to explain the actual alert, its source, flow, sink, and public-data
   boundary. Have Red distinguish observed facts from potential impact. Red
   does not generate payloads, run an exploit, or change code.
1. Run `npm run codeql:review -- baseline` to inspect the repository, commit,
   and report URL. Read the alert yourself, then confirm:

   ```bash
   npm run codeql:review -- baseline --reviewed
   npm run phase -- purple
   ```

The expected rule is `js/sql-injection`, commonly titled
"Database query built from user-controlled sources". Use the real reported
file and line, not an assumed location. Continue to [Step 3](3-step.md).

> [!IMPORTANT]
> If the scan is queued, failed, inaccessible, or has no matching finding,
> do not substitute a reference screenshot or a quiz for repository evidence.
> Report CodeQL pending where appropriate and ask the facilitator. If Blue's
> code is already safe, record that outcome; do not manufacture a defect.

<details>
<summary>Having trouble? 🤷</summary>

- Ask Red to explain source, flow, and sink using the report's own file links.
- Compare query syntax with separately bound values. Normalization alone is
  not parameter binding.
- A missing Set up control may mean insufficient repository permissions,
  licensing, or an organization policy. Ask the facilitator.
- The review command uses your existing `gh` login. Never paste a token into chat.

</details>
