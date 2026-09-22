## Step 1: Red detects the broken boundary

**Hands-on target: minutes 10–17.** You are the decision-maker. Red supplies
runtime evidence; you predict first and distinguish facts from conclusions.
The SQL injection is already present in the starting application. Red does not
add or modify vulnerable code; Red only detects and demonstrates the existing
behavior with the supplied read-only request.

### 📖 Theory: Evidence before conclusions

A useful security result distinguishes expected behavior, observed behavior, and
the conclusion supported by the difference. The public hotel search must return
only published inventory.

### ⌨️ Activity: Reproduce the supplied payload

1. Ask Squad to start the local application in the background:

   ```text
   Start the workshop application with npm run workshop:app, confirm that it
   responds locally, and keep this terminal available for our investigation.
   ```

1. Select Squad with `/agent`, then ask Red in clear English:

   ```text
   Present the expected public boundary and ask me to predict the result. Then
   ask Red to reproduce only the supplied local payload. Separate observed
   facts from conclusions.
   ```

1. Before Red runs anything, predict the result:

   | Check | Expected evidence |
   | --- | --- |
   | Normal `Paris` search | 2 public listings |
   | Supplied payload | 12 listings, including 4 unpublished |
   | Synthetic unpublished impact | 27,400 reservations |

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
- Red must use only `npm run exploit`; do not paste credentials or tokens into
  Copilot.
- If the output differs, record the actual output and ask Red to explain it
  before moving on.

</details>
