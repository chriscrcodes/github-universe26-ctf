---
title: Workshop Work Routing
description: "Participant-led delegation to Blue, Red, Green and Purple with explicit approval boundaries."
---

## Routing Table

| Work Type | Route To | Boundaries |
|-----------|----------|------------|
| Workshop checkpoint validation | Purple | Human reviewer validates the named evidence and pauses for the participant to relay the decision |
| Initial synthetic feature delivery | Green | Integrate the supplied prototype and request authorization before pushing only `feature/city-search` |
| Security alert and impact review | Red | Read-only review of code, CodeQL results and provided evidence |
| Remediation comparison and proposal | Green | Explain source, sink and flow without a quiz; propose the exact patch; do not edit the correction |
| Approved remediation and final delivery | Blue | Apply the approved Green patch on `fix/city-search`, verify it, open a PR to `main` and merge only after participant authorization |
| Safety and privacy | rai-agent | Review policy concerns without substituting for participant approval |
| Claim verification | fact-checker | Verify evidence and label unconfirmed claims |
| Session memory | Scribe | Preserve decisions and learning in the background |
| Work monitoring | Ralph | Report delegated work status without advancing the workshop |
| Conflicting conclusions | Blue, Red, Green | Surface the disagreement; the participant decides |

## Purple's Approval Gates

Purple is a human roster member, not an agent. Squad routes each gate to Purple
and pauses. The participant relays the relevant diff, checks or hosted evidence
to Purple outside Squad, then tells Squad Purple's actual decision. Never infer
approval from silence, a passing check or the participant's own review.

| Gate | Purple reviews | Continue only after |
|------|----------------|--------------------|
| Initial delivery (`red`) | Green's delivered diff, ordinary-search baseline and delivery checks for the pushed commit | Purple approves the evidence; the participant separately publishes `red` |
| CodeQL baseline (`purple`) | The observed synthetic result and matching alert on the delivered commit | Purple approves the evidence; the participant separately publishes `purple` |
| Correction scope | Green's exact parameter-binding diff and agreed test scope | Purple approves the proposed scope; the participant separately approves Blue to apply it |
| Corrected delivery (`green`) | Blue's applied diff, restarted-app results and local verification | Purple approves the evidence; the participant separately authorizes commit and push |
| Pull request (`blue`) | The complete PR diff and required checks | Purple approves the review; the participant separately authorizes merge |
| Final CodeQL (`codeql`) | The original alert's fixed state and successful analyses for the corrected commit | Purple approves the hosted evidence; the participant separately publishes `codeql` |

## Rules

1. The participant chooses the next task and agent. Do not automatically run
   the entire journey or replace participant decisions with an agent's approval.
2. Route each listed workshop checkpoint to Purple. If Purple rejects or asks
   for changes, stop the dependent progression, address the concern and request
   a new review of the changed evidence. Do not seek approval for unchanged,
   rejected work.
3. Red is read-only. Review the alert and evidence; do not introduce defects,
   generate attack payloads, automate exploitation or target external systems.
   After answering, stop without offering a follow-up menu, remediation options
   or a committed findings summary.
4. Green integrates only the supplied prototype for the explicitly authorized
   initial synthetic challenge, requests push authorization and pushes only
   `feature/city-search`. Green later proposes the exact correction but does
   not edit or push it.
5. Blue applies only the participant-approved correction after a matching
   CodeQL finding is reviewed. Create `fix/city-search` from the delivered
   `feature/city-search` baseline. Restore parameter binding and public-listing
   filtering while preserving existing bound filters and allowlisted sort keys.
   Blue requests authorization before pushing the correction branch and opening
   a PR to `main`, then again before merging it. Never push directly to `main`.
6. Both agents report failed or pending checks accurately instead of claiming
   completion.
7. Answer the participant's question first. Offer an optional hint when asked;
   do not reveal the entire solution or assign an unsolicited next task.
