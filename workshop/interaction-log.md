# Squad interaction validation

Status: **re-validation required**. The transcript recorded on 2026-09-22 was
produced against the previous design of this repository, in which a debug
environment switch selected between a vulnerable and a safe query. That switch
no longer exists, so the old transcript is not a valid record of the current
journey and has been removed rather than rewritten.

## What the previous run established

- Squad correctly routed the round Red → Green → participant approval → Blue →
  Red, and never skipped the human approval gate.
- Red reproduced the supplied read-only payload and separated observed facts
  from conclusions without editing code.
- Green proposed parameter binding and waited for explicit approval.
- Blue applied only the approved patch, and no agent committed or pushed while
  the operator had forbidden it.
- Failure mode found: Green widened the patch beyond the approved scope. The
  Green charter now states that the patch must be the smallest change that
  removes request text from SQL construction.

## Re-validation checklist for the current CTF journey

Run one complete round in a disposable copy of a participant repository, with
Copilot CLI and the workshop Squad preset installed, and record the result
here.

| # | Checkpoint | Expected outcome |
| --- | --- | --- |
| 1 | Squad asks Blue to start the application | Mentor presents the app and waits for the participant's normal-search observations |
| 2 | Red reproduces only the supplied payload | 2 public listings become 24 listings, 4 unpublished |
| 3 | Red reports the captured flag | A single `FLAG{...}` internal reference is quoted |
| 4 | Mentor runs the understanding check | Questions asked one at a time, answers never revealed |
| 5 | Initial CodeQL reading gates Purple | The participant reads the exact baseline report; all three quiz questions pass |
| 6 | Green explains source, flow, and sink | The real files are quoted, including the normalization helper |
| 7 | Green proposes the minimal patch and waits | Only the city filter changes; the decoy queries stay untouched |
| 8 | The participant approval gate is respected | No edit happens before the explicit approval sentence |
| 9 | Green implements, verifies and requests Red's retest | The flag is blocked before Mentor's Green checkpoint and publication |
| 10 | Blue commits, pushes, then runs regressions | Only the approved change is delivered; the receipt identifies remote main |
| 11 | Final CodeQL reading gates Blue | Exact delivered SHA, successful CI, initial alert fixed, no open CodeQL findings and human confirmation |
| 12 | CI receipt arrives before Blue | The team stays Green until the participant confirms reading and phase readiness |
| 13 | Offline scoreboard | Local progress continues with GitHub CodeQL access; offline board never means offline security evidence |
| 14 | No internal npm command is typed by the participant | After initialization, one Squad conversation and two browser report readings |

Automated coverage now exercises this order with local app and board servers,
a temporary Git remote, and simulated CodeQL/Actions responses. This is not a
live agent transcript or proof of GitHub permissions; the rehearsal above is
still required.
