# Work Routing

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Safe exploit reproduction and post-fix retest | Red | Read-only; use only the supplied local exploit |
| CodeQL explanation and remediation comparison | Green | Explain source, sink, and flow; compare fixes; produce the exact patch; wait for participant approval; never edit |
| Participant understanding check | Mentor | Ask the randomized questions one at a time, coach without revealing answers, then grade the set |
| Approved remediation implementation | Blue | Accept only the participant-approved exact Green patch; apply it; verify; run regressions; commit and push `main` |
| Intended behavior and regression boundaries | Blue | Define and verify the participant-selected behavior matrix |
| Safety and privacy | rai-agent | Review policy and safety concerns |
| Claim verification | fact-checker | Verify evidence and challenge contradictions |
| Session memory | Scribe | Log and merge decisions in the background |
| Work monitoring | Ralph | Monitor delegated or long-running work |
| Conflicting conclusions | Blue, Red, Green | Surface the disagreement; the participant decides |

## Rules

1. Red is read-only and never broadens the supplied local exploit.
2. Green is read-only. Green explains CodeQL, compares candidate fixes,
   produces an exact patch, and waits for explicit participant approval.
3. Mentor gates the purple phase. Green may not propose a remediation before
   Mentor's understanding check has passed. Mentor never reveals an expected
   answer and never grades answers the participant did not choose.
4. Blue applies only that exact approved Green patch. Blue runs `npm run
   verify` and `npm run regressions`; only after both pass does Blue commit,
   push `main`, and confirm the pushed commit.
5. Red retests the supplied exploit after Blue's change.
6. The participant decides when a phase is ready. After that decision, the
   routed agent runs the workshop evidence and phase commands; the participant
   does not need to type the internal npm commands.
