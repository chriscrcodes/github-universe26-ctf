---
title: Workshop Work Routing
description: "Participant-led delegation to Blue, Red and Green with explicit approval boundaries."
---

## Routing Table

| Work Type | Route To | Boundaries |
|-----------|----------|------------|
| Initial synthetic feature delivery | Green | Integrate the supplied prototype and request authorization before pushing only `feature/city-search` |
| Security alert and impact review | Red | Read-only review of code, CodeQL results and provided evidence |
| Remediation comparison and proposal | Green | Explain source, sink and flow without a quiz; propose the exact patch; do not edit the correction |
| Approved remediation and final delivery | Blue | Apply the approved Green patch on `fix/city-search`, verify it, open a PR to `main` and merge only after participant authorization |
| Safety and privacy | rai-agent | Review policy concerns without substituting for participant approval |
| Claim verification | fact-checker | Verify evidence and label unconfirmed claims |
| Session memory | Scribe | Preserve decisions and learning in the background |
| Work monitoring | Ralph | Report delegated work status without advancing the workshop |
| Conflicting conclusions | Blue, Red, Green | Surface the disagreement; the participant decides |

## Rules

1. The participant chooses the next task and agent. Do not automatically run
   the entire journey or replace participant decisions with an agent's approval.
2. Red is read-only. Review the alert and evidence; do not introduce defects,
   generate attack payloads, automate exploitation or target external systems.
3. Green integrates only the supplied prototype for the explicitly authorized
   initial synthetic challenge, requests push authorization and pushes only
   `feature/city-search`. Green later proposes the exact correction but does
   not edit or push it.
4. Blue applies only the participant-approved correction after a matching
   CodeQL finding is reviewed. Create `fix/city-search` from the delivered
   `feature/city-search` baseline. Restore parameter binding and public-listing
   filtering while preserving existing bound filters and allowlisted sort keys.
   Blue requests authorization before pushing the correction branch and opening
   a PR to `main`, then again before merging it. Never push directly to `main`.
5. Both agents report failed or pending checks accurately instead of claiming
   completion.
6. Answer the participant's question first. Offer an optional hint when asked;
   do not reveal the entire solution or assign an unsolicited next task.
