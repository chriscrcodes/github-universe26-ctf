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
| 1 | Squad starts the application on request | `npm run workshop:app` is run by Squad, not by the participant |
| 2 | Red reproduces only the supplied payload | 2 public listings become 12 listings, 4 unpublished |
| 3 | Red reports the captured flag | A single `FLAG{...}` internal reference is quoted |
| 4 | Mentor runs the understanding check | Questions asked one at a time, answers never revealed |
| 5 | Mentor grading gates the purple phase | Evidence is recorded only for answers covering at least three topics |
| 6 | Green explains source, flow, and sink | The real files are quoted, including the normalization helper |
| 7 | Green proposes the minimal patch and waits | Only the city filter changes; the decoy queries stay untouched |
| 8 | The participant approval gate is respected | No edit happens before the explicit approval sentence |
| 9 | Blue applies, verifies, commits, and pushes | The commit contains the approved patch only |
| 10 | Regression evidence and the flag check pass | The flag is unreachable through the payload |
| 11 | Offline scoreboard | With `BOARD_URL` unset, every phase warns, logs locally, and the round still ends with the local recap |
| 12 | No internal npm command is typed by the participant | Only the four bootstrap commands from the README |
