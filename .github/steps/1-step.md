## Step 1: Red captures the flag

**Hands-on target: minutes 10–17.** You are the decision-maker. Red supplies
runtime evidence; you predict first and distinguish facts from conclusions.
The SQL injection is already present in the starting application. Red does not
add or modify vulnerable code; Red only detects and demonstrates the existing
behavior with the supplied read-only request.

### 📖 Theory: Evidence before conclusions

A useful security result distinguishes expected behavior, observed behavior, and
the conclusion supported by the difference. The public hotel search must return
only published inventory. Unpublished listings carry an internal reference, and
one of those references is the flag for this round.

Nothing in the code is labelled as vulnerable. Several queries in the same
files are already parameterized, and the search input is passed through a
normalization helper. Evidence, not reading speed, is what tells you which
query is unsafe.

### ⌨️ Activity: Capture the flag with the supplied payload

1. Ask Squad to start the local application in the background:

   ```text
   Start the workshop application with npm run workshop:app, confirm that it
   responds locally, and keep this terminal available for our investigation.
   ```

1. Select Squad with `/agent`. If Copilot asks for permission to run tools,
   choose **Allow all** for this workshop session. Then ask the Squad
   coordinator to dispatch Red with this complete prompt:

   ```text
   Squad, dispatch Red now. Present the expected public boundary and ask me to
   predict the result before running anything. Red must reproduce only this
   supplied local read-only payload against the local application:
   city=%27%20OR%201%3D1%20--%20
   (URL-encoded form of the supplied read-only payload: `' OR 1=1 -- `)
   Report the internal reference of every listing that should not have been
   returned. Separate observed facts from conclusions. Do not invent another
   payload, target an external system, or edit code.
   ```

1. Before Red runs anything, predict the result:

   | Check | Expected evidence |
   | --- | --- |
   | Normal `Paris` search | 2 public listings |
   | Supplied payload | 12 listings, including 4 unpublished |
   | Synthetic unpublished impact | 27,400 reservations |
   | Captured flag | One `FLAG{...}` internal reference |

1. Ask Red to explain what changed and what each part of the supplied payload
   does. Red must not edit code, introduce a vulnerability, invent a payload,
   or target a non-local system.
1. Ask Red to run the deterministic evidence command and publish the `red`
   phase after the exact assertions pass. You do not need to type those npm
   commands yourself.

<details>
<summary>Having trouble? 🤷</summary><br/>

- Ask Squad to inspect `.workshop-app.log` if the background application does
  not respond.
- Red must use only the canonical local exploit; do not paste credentials or
  tokens into Copilot.
- If Squad says that no payload was supplied or that it cannot dispatch Red,
  confirm that you selected the local Squad agent with `/agent`, selected
  **Allow all**, and used the complete prompt above.
- If the output differs, record the actual output and ask Red to explain it
  before moving on.
- If the scoreboard is offline, keep going: Squad records every phase locally.

</details>
