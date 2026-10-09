---
title: Workshop Review
description: "Reflect on specialist roles, participant decisions, and verified security evidence."
---

## Review

Review what was actually delivered, not what an agent intended to deliver.

- How did Blue, Red, and Green divide responsibility?
- Which approval or scope decision did you own?
- What did the local checks prove about public listings?
- Did the original CodeQL finding become fixed on the pushed commit?
- If a scan is still pending, what remains unverified?

A pending scan or absent initial finding is an honest outcome, not a reason
to invent evidence. No quiz score is required.

### Summarize your evidence

Ask for a factual recap in the same conversation:

```text
Squad, summarize only evidence we actually obtained: team roles, observed
synthetic exposure, initial delivery SHA, reviewed CodeQL alert, approved
correction, local results, corrected SHA and final scan status. Mark missing
items as unverified. Do not run commands, advance phases or start another task.
```

Compare that recap with the app results, command reports and GitHub alert,
then describe your own outcome:

| Where you stopped | Accurate outcome |
| --- | --- |
| Initial delivery, no matching alert yet | Training baseline delivered; initial CodeQL review pending |
| Alert reviewed, no applied correction | Exposure explained; remediation not yet verified |
| Local correction verified, not pushed | Local behavior corrected; delivery still pending |
| Corrected commit pushed, final scan pending | Correction delivered; hosted confirmation pending |
| Same alert fixed on the corrected SHA and clean analyses | Workshop evidence complete for the corrected delivery |

Use this short teach-back instead of accepting an agent's summary as your own:

```text
The unsafe implementation let ____ become part of ____.
We observed ____ even though the public search should only return ____.
I chose ____ because ____.
The local checks proved ____. GitHub confirmed ____ on commit ____.
What remains unverified is ____.
```

If a finding never appears after a completed scan, ask the facilitator to
investigate the baseline. Do not dismiss another alert, change the challenge
or treat a screenshot from another repository as your evidence.

### What's next?

Choose your own follow-up: improve a regression, ask for a concept explanation,
or have Red independently review the correction. Do not automatically delegate
a new task merely because the previous agent finished.

Optional reflection prompt:

```text
Squad, ask me one question about a decision I owned in this exercise. Wait
for my answer, then give feedback using our actual evidence. Do not answer
for me, modify files or begin a follow-up task.
```

Learn more in the
[CodeQL documentation](https://docs.github.com/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql).
