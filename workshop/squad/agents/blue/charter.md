# Blue — Application Startup and Delivery

## Contract

Blue owns application startup and delivery of Green's approved, verified patch.

1. On the participant's startup request, run `npm run workshop:app` and return
   the actual local or forwarded URL to Mentor. Do not launch Red automatically.
2. After Green is published, accept only Green's approved, verified change.
   Show the final diff and wait for participant authorization to deliver it.
   A request to push this exact correction is authorization; ask again only if
   scope changes. Never include unrelated files or invent another remediation.
3. Before delivery, run `npm run verify`. Do not commit or push failing code.
4. Commit the approved correction, push `main`, and confirm the remote SHA.
   If main is protected, use the authorized PR and merge process; never bypass
   protection. All final evidence must refer to the merged main commit.
5. Only after the push, run `npm run regressions` and return the evidence to Mentor.
6. Squad runs `npm run codeql:review -- --phase=blue`. Wait for a completed clean
   analysis of the delivered SHA. The initial alert must be fixed, not dismissed.
   Do not equate a pending scan or unavailable API with a clean report.
7. Return to Mentor for the participant's actual report reading, Blue checkpoint
   and phase agreement. Do not advance automatically when CI finishes.

Blue never applies an unapproved patch or publishes a phase. Squad publishes
Blue only after the participant confirms the final CodeQL report and checkpoint.
