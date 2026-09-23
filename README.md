<div align="center">

<h1>Capture the flag: Three AI teams, one codebase, zero mercy</h1>

<p><strong>Lead an AI purple team with GitHub Copilot, capture the hidden flag, and close the hole you just walked through.</strong></p>

<p>
  <a href="https://githubuniverse.com/"><img src="https://img.shields.io/badge/GitHub%20Universe-2026-181717?logo=github&amp;logoColor=white" alt="GitHub Universe 2026"></a>
  <a href=".github/steps/1-step.md"><img src="https://img.shields.io/badge/capture%20the%20flag-45%20minutes-8250df" alt="45-minute capture the flag"></a>
  <a href="https://github.com/features/codespaces"><img src="https://img.shields.io/badge/GitHub-Codespaces-24292f?logo=github&amp;logoColor=white" alt="GitHub Codespaces"></a>
</p>

</div>

## Welcome

- **Who is this for**: Developers, security practitioners, and technical leads
  who want to collaborate with AI agents while retaining engineering judgment.
- **What you'll learn**: Define a trust boundary, combine runtime and CodeQL
  evidence, approve a safe correction, and verify it with local regressions.
- **What you'll build**: An evidence-backed correction to a hidden SQL
  injection and a regression matrix that protects the public-listing boundary.
- **Prerequisites**:
  - A GitHub account and access to GitHub Copilot CLI.
  - Basic familiarity with source code and a terminal.
  - No penetration-testing experience is required.
- **How long**: 45 minutes: **10 min intro**, **30 min hands-on**, and
  **5 min debrief**.

In this exercise, you will:

1. 🔴 [Capture the flag behind the broken boundary](.github/steps/1-step.md).
1. 🟣 [Prove that you understand the CodeQL flow](.github/steps/2-step.md).
1. 🟢 [Review and explicitly approve a correction](.github/steps/3-step.md).
1. 🔵 [Apply, test, commit, and push the approved patch](.github/steps/4-step.md).

### The flag

A hotel search returns published inventory only. Somewhere behind that search,
unpublished listings carry an internal reference — and one of them is your
`FLAG{...}`.

## Meet Squad

**Squad** is a custom GitHub Copilot CLI agent that coordinates several
specialists inside this repository. You talk to the coordinator in natural
language; it routes your request to the right role and manages the handoffs.
During the workshop, Squad coordinates specialist tasks and helps gather
evidence. You run the setup commands yourself and remain responsible for
predictions, approval, evidence review, and phase publication.

> [!NOTE]
> Red, Green, Blue, and Mentor are workshop roles. The participant remains
> responsible for predictions, approval, evidence review, and phase publication.
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
| 🔴 **Red** | Capture the flag by detecting the pre-existing vulnerability | Never edits code or introduces a vulnerability |
| 🟣 **Mentor** | Check that *you* understood the capture before a fix is discussed | Never reveals an expected answer |
| 🟢 **Green** | Explain CodeQL and propose the correction | Waits for your explicit approval |
| 🔵 **Blue** | Apply the approved patch, run tests, and publish it | Changes only the approved scope |

Learn more about the upstream project in the
[Squad documentation](https://bradygaster.github.io/squad/).

### Workshop timing

**10 min — Intro:** understand Squad and what this exercise sets out to prove.

**30 min — Hands-on:** initialize the team, Red captures the flag,
Mentor checks your understanding, Green explains and proposes, you approve, and
Blue applies and verifies.

**5 min — Debrief:** compare runtime evidence with CodeQL and discuss the
human/automation boundary.

### How to start this exercise

Start with [Step 1](.github/steps/1-step.md). It contains the complete setup,
pre-flight checks, and launch instructions. Run the setup commands in the
VS Code integrated terminal—not in Copilot Chat.

<p align="left">
  <a href=".github/steps/1-step.md"><img src="https://img.shields.io/badge/Start%20the%20exercise-%E2%86%92-1f883d?style=for-the-badge&amp;logo=github" alt="Start the exercise"></a>
</p>

<p align="left">
  <img src=".github/images/arcade-scoreboard-participant.png" alt="Workshop scoreboard" width="900">
</p>
