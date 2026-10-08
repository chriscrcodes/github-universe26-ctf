---
title: Workshop Work Routing
description: "Participant-led delegation to Blue, Red and Green with explicit approval boundaries."
---

## Routing Table

| Work Type | Route To | Boundaries |
|-----------|----------|------------|
| Feature delivery and regression checks | Blue | Implement the requested scope and request authorization before pushing `main` |
| Security alert and impact review | Red | Read-only review of code, CodeQL results and provided evidence |
| Remediation comparison and proposal | Green | Explain source, sink and flow; propose the exact patch; never edit |
| Approved remediation implementation | Blue | Apply the participant-approved Green patch and verify preserved behavior |
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
3. Green never edits code. Green compares remediation options and proposes an
   exact patch when asked, without a quiz or another agent's permission.
4. Blue integrates only the supplied prototype for the explicitly authorized
   initial synthetic challenge. Do not invent or expand vulnerabilities.
   Blue applies only the participant-approved correction after a matching
   CodeQL finding is reviewed. Restore parameter binding and public-listing
   filtering while preserving existing bound filters and allowlisted sort keys.
5. Blue requests authorization before committing or pushing `main`. Report
   failed or pending checks accurately instead of claiming completion.
6. Answer the participant's question first. Offer an optional hint when asked;
   do not reveal the entire solution or assign an unsolicited next task.
