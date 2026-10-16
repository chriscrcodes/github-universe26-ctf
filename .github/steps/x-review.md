---
title: Workshop Review
description: "Reflect on specialist roles, participant decisions, and verified security evidence."
---

**Workshop steps:** ✅ [1. Baseline](1-step.md) → ✅ [2. Exposure](2-step.md) → ✅ [3. Correction scope](3-step.md) → ✅ [4. Delivery](4-step.md) → 🎯 **Review** · Tasks 01–15 complete

## Review: What You Learned

The workshop follows untrusted city input from the HTTP request to SQL execution.
The important boundary is at the database query, where user input must remain a
value rather than becoming part of SQL syntax.

### Security lessons

* SQL string construction can turn an untrusted value into executable query syntax.
* Parameter binding keeps the query structure separate from user-controlled values.
* The public-listing condition must be enforced by the server-side query, not by
  hiding results in the browser.
* A CodeQL alert describes a source-to-sink path. Its status must be checked on
  the exact commit being reviewed.

### Evidence trail

| Phase | What its evidence establishes |
| --- | --- |
| `red` | The supplied challenge delivery and its observed behavior against synthetic data |
| `purple` | Participant attestation for the exact delivered commit; this alone does not prove a hosted scan completed |
| `green` | Local verification of the approved correction and preserved search behavior |
| `blue` | The pushed `fix/city-search` correction and its delivery regression results; the PR remains unmerged |
| `codeql` | The original finding is fixed on the corrected commit and successful hosted analyses confirm the result |

An agent's summary is not a substitute for the diff, command output, commit, or
hosted scan. Mark evidence that was not observed as unverified. A pending scan
or an absent initial finding must not be reported as a confirmed clean result.

### Workshop responsibilities

* Blue delivered the supplied initial prototype; Green analyzed the finding and proposed the correction.
* Red reviewed security evidence without changing the application.
* Blue applied the participant-approved correction and delivered it through a PR.
* Purple reviewed checkpoints as the human validation reviewer.
* The participant owned approval, authorization, and decisions to publish milestones.

The scoreboard phases record distinct evidence, not interchangeable approvals.
Keep the observed synthetic exposure, local verification, merged delivery, and
hosted CodeQL result separate when describing what the workshop established.
