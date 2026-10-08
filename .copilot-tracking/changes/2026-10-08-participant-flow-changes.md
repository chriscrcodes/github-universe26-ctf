---
title: Participant Flow Implementation
description: Local implementation and verification of the agreed 30-minute synthetic Squad challenge
ms.date: 2026-10-08
---

## Scope and Decisions

The participant chose to keep Blue's feature implementation inside the timed
exercise and explicitly authorized integration of the supplied intentionally
vulnerable prototype on fictitious data only. This is a planned training
baseline, not a spontaneous model mistake or a safe production release.
No commit, push, deployment, GitHub configuration or live board mutation was
performed during this implementation.

## Completed Locally

- Initial delivery now checks normal searches and the exact synthetic exposure
  through HTTP and records a versioned fixture receipt. A safe or unrelated
  baseline does not satisfy the challenge gate.
- The initial phase requires that exposure receipt. Existing phase ordering,
  participant approval and exact-commit CodeQL checks remain intact.
- After recruitment, `npm run workshop:start` adopts the role contracts,
  runs Squad doctor, registers the participant and launches the app. It stops
  on failure and does not choose a next task, authorize a push or publish phases.
- The user's existing board-identity mapping was preserved and covered by tests.
- Blue's charter permits only the supplied initial prototype in the authorized
  isolated exercise. Red and Green remain read-only; remediation still requires
  review of a matching alert and explicit participant approval.
- The app binds to loopback. The starter city-search function remains
  unimplemented so Blue still performs the exercise during the workshop.
- Participant steps and README include short prompts, the revised schedule,
  teach-back, a provisional minute-16 baseline stop and truthful final pending status.
- Facilitator labels describe evidence rather than agent colors. Guides,
  runbook and slides cover the same schedule, preflight and scan recovery.
- Board storage isolation uses an explicit organizer reset or dedicated storage
  per session; the globally keyed D1 schema was not migrated.

## Verification

- Node.js 22 participant suite: 98 passed, 5 skipped, 0 failed.
- Node.js 22 facilitator suite: 56 passed, 9 skipped, 0 failed.
- The HTTP integration test assembles the supplied function in the actual app
  module and serves the real routes in an isolated worker. It verifies the
  expected 24-row exposure with 4 unpublished records, then zero results for
  the same input after parameter binding. Detail and partner boundaries remain intact.
- Startup tests cover sequence, every failure boundary, identity mapping and
  app-only restart preserving participant state.
- Existing CodeQL tests still reject stale or unmatched SHAs, failed retries,
  missing or dismissed alerts and unrelated corrected commits.
- Both tracked diffs pass `git diff --check`; touched executable files have no
  reported editor diagnostics.
- External-service tests remain skipped deliberately. These results do not
  demonstrate hosted CodeQL completion or deployed-board capacity.

## Organizer Gates Before the Event

1. Pilot the exact supplied source and bound correction in an authorized
   disposable repository with the event's CodeQL configuration. Require an
   open `js/sql-injection` alert on the initial SHA and the same alert fixed
   on the corrected SHA. If no matching finding exists, investigate the
   baseline rather than expanding the vulnerability or fabricating evidence.
2. Verify all participant repositories: namespace, EMU and runner eligibility,
   push/API access, supported language, setup health, triggers and authentication.
3. Confirm mapping among repository, participant identity, board ID and session.
   Reset or isolate storage and verify empty state before registration.
4. Rehearse near 74 concurrent participants. Measure baseline and fixed scan
   tail latency and calibrate the provisional minute-16 stop threshold.
5. Treat minute-30 local correction delivered and hosted confirmation pending
   as separate outcomes. Resume review later without weakening evidence gates.

## Participant Documentation Follow-up

The README and all five participant lesson pages now include additional
explanations, ready-to-use role prompts, expected observations, evidence
checkpoints and diagnostic prompts. The README also provides command and
milestone references. Approval guidance distinguishes reviewing an exact
diff from recording the strategy; the recap distinguishes local correction,
pushed delivery and hosted confirmation.

Following participant-facing feedback, the repeated README warning and
initial training-authorization wording were removed. The overview retains a
short fictitious-data and private-access description; commit/push approvals,
role contracts and exact-commit evidence gates are unchanged. Optional prompts
remain clearly identified so participants need not send every example.

Targeted verification after these documentation changes: 32 passed, 0 failed
across content, approval and CodeQL evidence tests with Node.js 22. No runtime
or facilitator files changed during this documentation follow-up.

### Overview and Setup Simplification

The README was subsequently shortened to the workshop overview, specialist
roles, timeline and starting point. Detailed command and evidence tables were
removed from the overview; manual board setup is collapsed. Step pages retain
the operational instructions and optional prompts.

Step 1 now explicitly excludes the Copilot coding agent during initialization
and recruitment, while preserving Squad's built-in support roles. Participants
no longer need to copy a SHA: delivery details and the existing review command
identify the analyzed version. Step 2 uses the same delivery-based explanation;
exact-commit evidence checks remain unchanged.

Verification: 38 passed, 0 failed across content, Squad initialization and
CodeQL evidence tests with Node.js 22.

### Retired Flow Cleanup

Removed the quiz question bank, quiz engine, checkpoint command and dedicated
checkpoint tests, plus the superseded exploitation scripts and their npm
entries. The facilitator's explicitly retired E2E scenario was also removed;
it still referenced the obsolete quiz and exploitation commands. Active
delivery, verification, approval and CodeQL evidence checks remain intact.

A content regression checks that retired files and npm commands stay absent.
Existing approval and phase tests still reject legacy quiz/exploit receipts.
Full Node.js 22 suites after cleanup: participant 98 passed and 5 external-service
checks skipped; facilitator 56 passed and 8 external-service checks skipped.
Neither suite had failures. Both repositories passed whitespace checks.

### Test Suite Rationalization

Participant documentation tests now use six structural and workflow checks
instead of 22 copy-specific tests. Facilitator documentation uses two checks
instead of four. Metadata, local links, declared commands, forward navigation,
repository ownership and retired-artifact protection remain covered; phrasing
and presentation are no longer pinned. Removed the duplicate San Francisco
markup assertion while keeping the local assertion in the hotels suite.

External suites use the `.integration.mjs` suffix and explicit
`npm run test:integration` commands. App checks select starter, challenge or
corrected behavior using `WORKSHOP_SEARCH_MODE`, not the nonexistent health
flag. An unavailable requested service fails the integration suite. App reset
requires an explicit `RESET_COMMAND` for an isolated rehearsal. External board
checks now probe one abusive identity and inspect privacy fields structurally,
allowing the intended CI repository receipt field.

The default suites run 135 tests, all passing with no skips: 81 participant and
54 facilitator. There are 13 additional opt-in integration cases. All four app
checks passed separately for each of the three stages, and all eight board
checks passed on a temporary in-memory board, including operator reset. The
external app reset was not executed against the active preview. No hosted
service or participant progress was reset. Total defined cases decreased from
167 to 148; the remaining reduction in the default count is separation, not
deleted behavioral coverage.

## References

- Research basis: participant-flow research supplied as a conversation attachment
- [Participant steps](../../.github/steps/1-step.md)
- [Blue contract](../../workshop/squad/agents/blue/charter.md)
- [Startup wrapper](../../scripts/workshop-start.mjs)
- [Initial delivery](../../app/scripts/delivery.js)
- [Phase gates](../../app/scripts/publish-phase.js)
- [CodeQL evidence](../../app/src/codeql-evidence.js)
