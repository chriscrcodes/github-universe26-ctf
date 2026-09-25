# Work Routing

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Explain the SQL injection and guide initial browser reproduction | Red | Name `buildCityFilter`, explain the supplied canonical payload, ask the participant to test it in the local UI |
| CodeQL explanation and approved remediation | Green | Explain the report; after Purple propose the exact patch; wait for approval, then implement and verify |
| Participant journey and understanding check | Mentor | Guide one action at a time; ask the deterministic three-question set without revealing answers |
| Application startup and approved delivery | Blue | Start the app; after Green, verify, commit and push `main`, then run regressions |
| Intended behavior and regression boundaries | Blue | Define and verify the participant-selected behavior matrix |
| Safety and privacy | rai-agent | Review policy and safety concerns |
| Claim verification | fact-checker | Verify evidence and challenge contradictions |
| Session memory | Scribe | Log and merge decisions in the background |
| Work monitoring | Ralph | Monitor delegated or long-running work |
| Conflicting conclusions | Blue, Red, Green | Surface the disagreement; the participant decides |

## Rules

1. Red is read-only and never broadens the supplied local exploit.
2. Green explains CodeQL before Purple, but proposes a fix only after Purple
   publication. Green waits for explicit participant approval before applying
   the exact patch, restarting the app and running `npm run verify`.
3. Mentor guides the participant throughout the workshop. Red publishes
   automatically when the server verifies the participant's canonical browser
   test; there is no Red quiz. For Purple, Green and Blue, Mentor asks the
   deterministic three-question quiz in Squad's conversation and Squad runs the
   checkpoint command; the participant never opens a second terminal or runs
   workshop commands after initialization.
   Green may not propose a remediation before Purple is published.
   After a wrong quiz answer, Mentor gives the correct option and explanation
   and proceeds without repeating the question. Mentor never grades an answer
   the participant did not choose.
4. Blue starts the app on request. After Green publication and delivery
   authorization, Blue runs `npm run verify`, commits and pushes `main`, then
   runs `npm run regressions`. Respect protected-main PR and merge requirements.
5. Red retests the supplied exploit after Green's change, before Green publication.
6. The routed agent collects evidence. The canonical Red browser test triggers
   its phase event automatically. For later phases, Mentor runs the quiz and
   the participant decides when the phase is ready; only then does Squad run
   the phase command. The participant does not type internal npm commands.
7. Mentor is the continuous guide in one Squad conversation. Return to Mentor
   after each specialist and never anticipate the next participant decision.
   Blue startup is followed by actual application observation, not an exploit.
8. Before Purple and Blue, Squad runs `npm run codeql:review -- --phase=<phase>`.
   Mentor gives the actual report URL and asks the participant to read it.
   Only after that human confirmation, Squad repeats the command with
   `--confirm --analysis=ID --commit=SHA`. If the report is inaccessible, a
   participant may explicitly use `--override --reason=...`; mark it unverified,
   never clean. Stale reports must be reviewed again. Blue requires the initial
   alert fixed, not dismissed, on the delivered SHA unless the participant
   accepts an explicit unverified override.
