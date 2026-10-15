---
title: Workshop Work Routing
description: "Participant-led delegation to Blue, Red, Green and Purple with explicit approval boundaries."
---

## Routing table

| Work | Owner | Boundary |
| --- | --- | --- |
| Checkpoint validation | Purple | Review named evidence; wait for the participant to relay the decision |
| Initial synthetic feature | Green | Integrate the supplied prototype; request authorization before pushing only `feature/city-search` |
| Security review | Red | Review code, CodeQL results, and provided evidence without editing |
| Correction proposal | Green | Explain source, sink, and flow; propose the exact patch but do not edit or push it |
| Approved correction and delivery | Blue | Apply only the participant-approved correction on `fix/city-search`; verify it, open a PR to `main`, and merge only with participant authorization |
| Safety and privacy | rai-agent | Flag policy concerns; do not replace participant approval |
| Claim verification | fact-checker | Verify evidence and mark unconfirmed claims |
| Session memory | Scribe | Preserve decisions and learning |
| Work monitoring | Ralph | Report delegated work without advancing the workshop |
| Conflicting conclusions | Blue, Red, Green | Explain the disagreement; the participant decides |

## Purple's Approval Gates

Purple is a human roster member, not an agent. Squad pauses at each gate. The
participant shares the relevant diff, checks, or hosted evidence with Purple,
then relays Purple's actual decision to Squad. Never infer approval from
silence, a passing check, or the participant's own review.

| Gate | Purple reviews | Continue only after |
|------|----------------|--------------------|
| Initial delivery (`red`) | Green's delivered diff, ordinary-search baseline and delivery checks for the pushed commit | Purple approves the evidence; the participant then authorizes publishing `red` (`npm run workshop -- phase red`) |
| CodeQL baseline (`purple`) | The observed synthetic result and matching alert on the delivered commit | Purple approves the evidence; the participant then authorizes baseline attestation (`npm run codeql:review -- baseline --reviewed`) and publishing `purple` (`npm run workshop -- phase purple`) |
| Correction scope | Green's exact parameter-binding diff and agreed test scope | Purple approves the proposed scope; the participant then authorizes recording approval (`npm run approve -- parameter-binding`) so Blue may apply it |
| Corrected delivery (`green`) | Blue's applied diff, restarted-app results and local verification | Purple approves the evidence; the participant then authorizes publishing `green` (`npm run workshop -- phase green`), committing, pushing and opening the PR |
| Pull request (`blue`) | The complete PR diff and required checks | Purple approves the review; the participant then authorizes merging the PR |
| Merged delivery (`blue`) | The merge commit on `origin/main` and `npm run regressions` output | Purple approves the evidence; the participant then authorizes publishing `blue` (`npm run workshop -- phase blue`) |
| Final CodeQL (`codeql`) | The original alert's fixed state and successful analyses for the corrected commit | Purple approves the hosted evidence; the participant then authorizes recording fixed review (`npm run codeql:review -- fixed --reviewed`) and publishing `codeql` (`npm run workshop -- phase codeql`) |

## Rules

1. The participant chooses each task and agent. Do not run the full journey
   automatically or treat an agent's approval as the participant's decision.
   Run `npm run workshop -- phase`, `npm run phase`, `npm run approve`, and
   `npm run codeql:review -- ... --reviewed` only after the participant relays
   Purple's approval and explicitly authorizes the command.
2. Route each listed checkpoint to Purple. If Purple rejects or requests
   changes, stop dependent work, address the concern, and request review of the
   changed evidence. Do not resubmit unchanged work.
3. Red is read-only. Do not introduce defects, generate attack payloads,
   automate exploitation, or target external systems. After answering, stop
   without offering follow-up actions or a committed findings summary.
4. Green integrates only the supplied prototype for the authorized synthetic
   challenge. Request push authorization and push only `feature/city-search`.
   Later, propose the exact correction without editing or pushing it.
5. Blue applies the participant-approved correction only after the matching
   CodeQL finding is reviewed. Branch `fix/city-search` from the delivered
   `feature/city-search` baseline. Preserve parameter binding, public-listing
   filtering, existing bound filters, and allowlisted sort keys. Get
   authorization before pushing the branch and opening a PR to `main`, then
   again before merging. Never push directly to `main`.
6. Report failed or pending checks accurately. Do not claim completion early.
7. Answer the participant's question first. Offer an optional hint when asked;
   do not reveal the entire solution or assign an unsolicited next task.
