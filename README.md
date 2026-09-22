<div align="center">

<h1>Break it, prove it, fix it</h1>

<p><strong>Lead an AI Purple Team with GitHub Copilot and secure a vulnerable hotel search.</strong></p>

<p>
  <a href="https://githubuniverse.com/"><img src="https://img.shields.io/badge/GitHub%20Universe-2026-181717?logo=github&amp;logoColor=white" alt="GitHub Universe 2026"></a>
  <a href=".github/steps/1-step.md"><img src="https://img.shields.io/badge/workshop-45%20minutes-8250df" alt="45-minute workshop"></a>
  <a href="https://github.com/features/codespaces"><img src="https://img.shields.io/badge/GitHub-Codespaces-24292f?logo=github&amp;logoColor=white" alt="GitHub Codespaces"></a>
</p>

<p>
  <a href=".github/steps/1-step.md"><img src="https://img.shields.io/badge/Start%20the%20exercise-%E2%86%92-1f883d?style=for-the-badge&amp;logo=github" alt="Start the exercise"></a>
</p>

</div>

## Welcome

- **Who is this for**: Developers, security practitioners, and technical leads
  who want to collaborate with AI agents while retaining engineering judgment.
- **What you'll learn**: Define a trust boundary, combine runtime and CodeQL
  evidence, approve a safe correction, and verify it with local regressions.
- **What you'll build**: An evidence-backed correction to a local SQL injection
  and a regression matrix that protects the public-listing boundary.
- **Prerequisites**:
  - A GitHub account and access to GitHub Copilot CLI.
  - Basic familiarity with source code and a terminal.
  - No penetration-testing experience is required.
- **How long**: 45 minutes: **10 min intro**, **30 min hands-on**, and
  **5 min debrief**.

In this exercise, you will:

1. 🔴 [Detect the boundary break](.github/steps/1-step.md).
1. 🟣 [Explain the CodeQL source-to-sink flow](.github/steps/2-step.md).
1. 🟢 [Review and explicitly approve a correction](.github/steps/3-step.md).
1. 🔵 [Apply, test, commit, and push the approved patch](.github/steps/4-step.md).

## Meet Squad

**Squad** is a custom GitHub Copilot CLI agent that coordinates several
specialists inside this repository. You talk to the coordinator in natural
language; it routes your request to the right role and manages the handoffs.

> [!NOTE]
> Red, Green, and Blue are workshop roles. The participant remains responsible
> for predictions, approval, evidence review, and phase publication.
> This is not an official Squad product demonstration.

<p align="center">
  <img src=".github/images/purple-team-terminal.svg" alt="Copilot CLI terminal showing Squad routing the investigation to Red, Green, and Blue while participant approval remains required" width="900">
</p>

<p align="center">
  <sub>Squad routes one investigation to Red, Green, and Blue. The participant
  remains responsible for approval and phase publication.</sub>
</p>

| Member | Responsibility | Boundary |
| --- | --- | --- |
| 🧭 **Squad** | Coordinate the investigation and route requests | Does not make your decisions |
| 🔴 **Red** | Detect and demonstrate the pre-existing vulnerability | Never edits code or introduces a vulnerability |
| 🟢 **Green** | Explain CodeQL and propose the correction | Waits for your explicit approval |
| 🔵 **Blue** | Apply the approved patch, run tests, and publish it | Changes only the approved scope |

To select and direct the team:

1. Open GitHub Copilot CLI.
1. Enter `/agent`.
1. Select **Squad**.
1. Describe your objective in **natural language** or address a role by name.

There is no `/squad` slash command. Useful Copilot CLI commands include:

| Command | Use |
| --- | --- |
| `/agent` | Browse and select the **Squad** custom agent |
| `/help` | Display Copilot CLI commands |
| `@app/src/hotels.js` | Add the vulnerable file to your message context |

For example:

```text
Introduce the team and ask me to define the expected behavior before
delegating. Require my approval for every code change.
```

Learn more about the upstream project in the
[Squad documentation](https://bradygaster.github.io/squad/).

### Workshop timing

**10 min — Intro:** meet the speakers, understand Squad, and see the Onepoint
use case. **30 min — Hands-on:** initialize the team, Red detects, Green
explains and proposes, you approve, and Blue applies and verifies.
**5 min — Debrief:** compare runtime evidence with CodeQL and discuss the
human/automation boundary.

### How to start this exercise

1. Select **Code → Codespaces → Create codespace on main**, or clone this
   repository locally.
1. Open a terminal in the repository. The facilitator-provisioned board
   configuration remains private, and this one-time command checks the
   environment and registers your participant identity:

   ```bash
   npm run workshop:start
   ```

   Do not create a `.env` file or commit these values. The facilitator injects
   `BOARD_URL`, `BOARD_TOKEN`, `BOARD_TEAM_ID`, and `BOARD_SESSION_ID` into the
   Codespace environment.

1. Initialize the participant's Squad configuration without adding workflows:

   ```bash
   squad init --no-workflows
   ```

   Keep this command interactive. When Squad asks whether to add the Copilot
   agent, answer **No**; the workshop uses the local Squad team installed
   below.

   ```bash
   npm run squad:install-workshop-team
   squad doctor
   ```

1. Open Copilot CLI, select the local **Squad** agent with `/agent`, and choose
   **Allow all** when Copilot asks for permission to run the workshop tools.
   Continue with [Step 1](.github/steps/1-step.md). From this point, ask Squad
   to start the application and run the workshop checks; you do not need to
   type the individual npm evidence commands.

> [!IMPORTANT]
> For EMU, **one repository per participant is recommended**. A shared `main`
> branch is unsupported for this workshop because participants commit and push
> their approved patch.

> [!CAUTION]
> Use only the supplied read-only payload against the local workshop
> application. Do not target external systems, use real credentials, or try
> destructive SQL.
>
> Red does not create the SQL injection. The vulnerable query already exists
> in the starting application; Red only detects it and demonstrates its impact
> with the supplied read-only request.

<details>
<summary>Having trouble? 🤷</summary><br/>

- If `squad init` is unavailable, confirm that the Squad CLI is installed and
  that the terminal is at the repository root.
- If `npm run squad:install-workshop-team` fails, rerun it after `squad init
  --no-workflows`; do not add workflows manually.
- If `squad doctor` reports a problem, save the diagnostic output and ask the
  facilitator before continuing.
- If CodeQL is still pending, use the workshop's reference finding, label it as
  fallback evidence, and continue the source/flow/sink explanation. A clean
  result after the approved patch is expected even when the first scan is
  delayed.

</details>

<p align="center">
  <img src=".github/images/arcade-scoreboard-participant.png" alt="Workshop scoreboard" width="900">
</p>
