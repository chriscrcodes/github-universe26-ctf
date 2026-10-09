---
title: "Capture the flag: Three AI teams, one codebase, zero mercy"
description: "A GitHub Copilot and Squad hotel-search security workshop with a local or shared scoreboard."
---

<div align="center">

<h2>Capture the flag: Three AI teams, one codebase, zero mercy</h2>

<p><strong>Build city search with Blue, record ordinary results, then review the evidence with Red.</strong></p>

<p>
  <a href="https://githubuniverse.com/"><img src="https://img.shields.io/badge/GitHub%20Universe-2026-181717?logo=github&amp;logoColor=white" alt="GitHub Universe 2026"></a>
  <a href=".github/steps/1-step.md"><img src="https://img.shields.io/badge/workshop-30%20minutes-1f883d" alt="30-minute workshop"></a>
  <a href="https://github.com/features/codespaces"><img src="https://img.shields.io/badge/GitHub-Codespaces-24292f?logo=github&amp;logoColor=white" alt="GitHub Codespaces"></a>
</p>

</div>

## 👋 Welcome

- **Who is this for**: Developers, security practitioners, and technical leads
  who want to work with AI agents without handing over engineering judgment.
- **What you'll learn**: Recruit specialist agents, read a CodeQL finding,
  approve a correction, and distinguish local checks from hosted scan evidence.
- **What you'll build**: An isolated hotel-search training prototype, then
  a parameter-bound correction, running locally and pushed to your `main`.
- **Prerequisites**: Your participant Codespace, with Node.js 22, dependencies,
  GitHub Copilot CLI, `gh`, Squad and CodeQL prepared by the facilitator.
  Basic terminal familiarity is enough.
- **How long**: 30 minutes, starting with **3 min discovery** and
  **5 min implementation**. GitHub analysis may finish after the workshop.

In this exercise, you will:

1. [Discover Squad, recruit your team, and deliver search](.github/steps/1-step.md).
1. [Explain the exposure and review the CodeQL finding](.github/steps/2-step.md).
1. [Ask Green for a correction and approve the scope](.github/steps/3-step.md).
1. [Ask Blue to deliver the correction and confirm CodeQL fixed](.github/steps/4-step.md).

The exercise uses fictitious hotel records and a supplied training prototype.
Keep the app local or privately forwarded in Codespaces. Your goal is to
record normal search behavior first, then investigate the challenge and restore
public-only search with parameter binding.

![Normal Paris search showing two hotel stays in the workshop web interface.](.github/images/sqli-demo/1-normal-search.png)

*📊 The baseline: two public stays for Paris.*

## 🤝 Meet Squad

**Squad** coordinates three specialists through GitHub Copilot CLI.
You run the setup commands yourself and recruit **Blue**, **Red** and **Green**.
Copilot CLI runs the conversation; the Copilot coding agent is not a team member.

> [!NOTE]
> Red, Green, and Blue are workshop roles defined in this repository.
> This is not an official Squad product demonstration.

<p align="center">
  <img src=".github/images/purple-team-terminal.svg" alt="Copilot CLI terminal showing Squad routing the investigation to Red, Green, and Blue while participant approval remains required" width="900">
</p>

<p align="center">
  <sub>Squad routes one investigation to Red, Green, and Blue. The participant
  remains responsible for approval and phase publication.</sub>
</p>

| Specialist | Responsibility |
| --- | --- |
| **Blue** | Implements the feature and approved correction |
| **Red** | Reviews code and CodeQL findings without editing |
| **Green** | Proposes a correction and explains trade-offs without editing |

Learn more about the upstream project in the
[Squad documentation](https://bradygaster.github.io/squad/).

Each step provides the commands, prompts and expected results when you need
them. Extra prompts under "Having trouble?" are optional.
You do not need to send every prompt to finish the exercise.

### ⏱️ Workshop timing

| Minutes | Segment | What happens |
| --- | --- | --- |
| 0-3 | Discover | Recruit Blue, Red, and Green with Squad |
| 3-8 | Implement | Blue integrates the supplied synthetic prototype |
| 8-10 | Verify and deliver | Record normal city result counts and authorize push |
| 10-16 | Explain and review | Red explains the code while CodeQL runs; inspect the finding |
| 16-19 | Choose | Green proposes the patch; you explain and approve it |
| 19-25 | Correct | Blue applies the approved patch; verify locally |
| 25-28 | Deliver correction | Review results, authorize push and record regressions |
| 28-30 | Debrief | Check the finding is fixed, or report CodeQL pending |

If analysis is delayed, follow [Step 2](.github/steps/2-step.md).
A delivered correction can still be "CodeQL pending"; do not report a pending
scan as clean. The scoreboard displays your milestones and does not independently
analyze your code.

### 🚀 How to start this exercise

1. Open the Codespace for your participant repository.
1. Follow [Step 1](.github/steps/1-step.md) to initialize Squad, recruit your
  three specialists and launch the app.
1. Run shell commands in a VS Code terminal and send prompts in the Squad
  conversation. Keep that conversation open for the remaining steps.

<p align="left">
  <a href=".github/steps/1-step.md"><img src="https://img.shields.io/badge/Start%20the%20exercise-%E2%86%92-1f883d?style=for-the-badge&amp;logo=github" alt="Start the exercise"></a>
</p>

![Humorous science-fiction illustration of Squad characters facing a creature in a corridor.](.github/images/squad.jpeg)

*A humorous interlude, not a literal workshop roster. Explore [Brady Gaster's Squad project on GitHub](https://github.com/bradygaster/squad). 🤖*
