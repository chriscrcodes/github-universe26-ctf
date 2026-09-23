# Facilitator runbook

Session title: **Capture the flag: Three AI teams, one codebase, zero mercy**.

## 45-minute agenda

| Time | Activity |
| --- | --- |
| 0:00-0:03 | Romain and Christophe: introductions and session objective |
| 0:03-0:06 | What Squad is: coordinator, specialists, routing, and human gates |
| 0:06-0:10 | Onepoint example: project context, squad composition, outcome, and the decision retained by the human |
| 0:10-0:13 | Codespace startup, board registration, and Squad initialization |
| 0:13-0:19 | Red captures the flag with the supplied SQL injection |
| 0:19-0:22 | Mentor's understanding check gates the purple phase |
| 0:22-0:24 | Green connects runtime evidence to the prepared CodeQL finding |
| 0:24-0:30 | Green compares remediations; participant approves parameter binding |
| 0:30-0:38 | Blue applies, verifies, commits, and pushes the exact approved patch |
| 0:38-0:40 | Regression evidence and CodeQL pending/clean status |
| 0:40-0:45 | Debrief: evidence chain, human judgment, and automated controls |

Keep the Onepoint example to one project problem, one squad shape, one concrete
benefit, and one decision that remained human. Do not use the hands-on time for
a general product demo.

Red never creates the vulnerability. The participant repository starts with
the vulnerable query already present; Red only detects it, sends the supplied
read-only request, and explains the observed impact.

## What the event operator provisions

The workshop asks the EMU operator for exactly two values and one repository
per participant. Everything else is derived at runtime.

| Item | Scope | Value |
| --- | --- | --- |
| `BOARD_URL` | Codespaces variable, Actions variable | The shared HTTPS scoreboard URL |
| `BOARD_TOKEN` | Codespaces secret, Actions secret | The shared scoreboard reporter token |

The participant's board identity is their GitHub handle, resolved from
`BOARD_USER`, then `GITHUB_USER`, then `gh api user`. The session identifier is
the event day in `yyyyMMdd` form, computed locally, so every participant lands
on the same board without any per-repository configuration. Set the optional
`BOARD_SESSION_ID` variable only to override that day, for example during a
rehearsal or a session that crosses midnight UTC.

There is no per-repository CI credential. The optional `ci-clean` event posted
by GitHub Actions uses the same shared `BOARD_TOKEN` and reports
`github.actor` as the team. If that secret is absent, the step is skipped and
the participant still finishes the round.

The participant never creates a `.env` file and never commits these values.

## Recommended EMU provisioning

EMU organizations support only internal and private repositories. Have an
approved operator import the public workshop source into an internal or private
repository owned by the EMU organization, then use that repository as the
internal/private workshop template. Do not ask managed users to create or
publish a public repository. The exact behavior for generating repositories from
an external public template and for cloning that source must be confirmed
directly with GitHub for the event tenant.

Provision one private repository and one Codespace per participant. Keep 5–10
private repositories as tested spares, but do not increase the board's
participant capacity: it remains **60 participants**. A shared `main` branch is
not supported because the exercise correlates one participant, one pushed
commit, and one CodeQL result.

Provision `BOARD_URL` and `BOARD_TOKEN` as Codespaces **development
environment secrets** on the repository's **Settings → Secrets and variables →
Codespaces** page, or as organization-level Codespaces secrets with an access
policy restricted to the workshop repositories. Repository-level values take
precedence over organization-level values; do not confuse Codespaces
development environment secrets with Actions secrets.

For the optional CodeQL-clean scoreboard update, provision the same two values
again as Actions **variables** (`BOARD_URL`) and Actions **secrets**
(`BOARD_TOKEN`). Keep the Actions configuration separate from the Codespaces
configuration.

Use organization-paid, organization-owned Codespaces for the event when the
EMU organization has a Team or Enterprise Cloud plan, Codespaces enabled for
the participants, and a non-zero budget. Confirm the budget and spending limit
before opening the room: organizations have no personal-account free quota,
and both active Codespaces compute/storage and prebuild storage are billable.
Prebuilds can reduce startup time, but their Actions-minute and persistent
storage costs mean they are an optimization to price, not a prerequisite.

Before opening the room:

1. Have the approved operator import the public source and validate the
   internal/private EMU template.
2. Create 60 participant repositories plus 5–10 private spares.
3. Provision `BOARD_URL` and `BOARD_TOKEN` for Codespaces with the intended
   repository/organization scope and access policy.
4. Provision the same two values for Actions if the optional CodeQL-clean
   scoreboard update is wanted.
5. Keep the advanced CodeQL workflow in the template, confirm it is enabled,
   and run it once so the SQL injection alert is already present before the
   event. The workflow has two jobs. The `codeql` job is green from the start
   and uploads the alert. The `verify` job is **expected to fail** before the
   fix, because it checks remediated behavior against the deliberately
   vulnerable baseline; it turns green once the participant pushes the
   approved patch. Keep CodeQL in its own job: a CodeQL step sharing the
   failing job makes GitHub display a misleading "Code scanning configuration
   error" in the Security tab.
6. Confirm Code Security licensing for the private repositories and the
   expected unique active committers; private-repository Code Security usage
   is licensed, not covered by public-repository free use.
7. Apply all D1 migrations, including `0003_ci_completion.sql`.
8. Test one complete participant journey, including one run with the board
   deliberately unreachable.

During the workshop, the participant runs only the four bootstrap commands in
the README. Everything else — starting the application, collecting evidence,
grading the understanding check, publishing phases, and the Git operations — is
asked of Squad in natural language. This keeps the conversation terminal
available and keeps the exercise a Squad demonstration rather than an npm
tutorial.

The following are event-owner checks, not assumptions: whether the tenant can
generate repositories from an external public template, the resulting clone
behavior, and the tenant's repository/Codespaces concurrency and capacity
limits. Obtain direct GitHub confirmation for each.

Authoritative references: [EMU managed-user restrictions](https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/understanding-iam-for-enterprises/abilities-and-restrictions-of-managed-user-accounts),
[Codespaces development environment secrets](https://docs.github.com/en/enterprise-cloud@latest/codespaces/managing-codespaces-for-your-organization/managing-development-environment-secrets-for-your-repository-or-organization),
[who owns and pays for Codespaces](https://docs.github.com/en/enterprise-cloud@latest/codespaces/managing-codespaces-for-your-organization/choosing-who-owns-and-pays-for-codespaces-in-your-organization),
[Codespaces billing](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces),
[Codespaces prebuilds](https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds),
[Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets),
[CodeQL scanning](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning), and
[Code Security billing](https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security).

## Deterministic gates

| Board state | Required evidence |
| --- | --- |
| Started | Participant handle registered by `npm run workshop:start` |
| Red | Canonical local exploit returns the expected 2-to-12 boundary break and the flag |
| Purple | Mentor graded the participant's answers across at least three topics |
| Green | Participant approval exists and the fixed behavior check passes |
| Blue | Regression matrix passes for a clean commit pushed on `main` |
| CodeQL clean | GitHub Actions posts a CI event for that repository and SHA |

Participants control predictions, explanations, approval, and phase
publication. Scripts control measurable local facts. Only GitHub Actions can
publish the final CodeQL-clean state.

This is a collaborative 30-minute game, not an anti-cheat competition. Trust
participants for predictions, explanations, approval, and triggering their
phases. Keep the local checks focused on preventing accidental skips and
providing useful recovery messages; do not add signed local receipts, per-phase
server challenges, or per-repository credentials that would slow down the
learning path. The GitHub Actions result remains the independent confirmation
that the pushed revision is CodeQL clean.

## The hidden vulnerability

There is no `VULNERABLE` switch and no debug flag. The injection lives in the
city filter of `app/src/search-query.js`, which composes its WHERE clause by
string interpolation while every neighbouring query binds its parameters.
`app/src/input-normalizer.js` deliberately looks protective: it trims, collapses
whitespace, and rejects `;`, `/*`, and `*/`, but it never touches the quote
character, so the canonical payload survives. Expect participants to propose
"just harden the normalizer" — that is the teachable moment of Step 3.

Verified with CodeQL 2.27.1: the starting application reports exactly one
`js/sql-injection` alert whose path runs `server.js → input-normalizer.js →
search-query.js → hotels.js`. After the approved parameter-binding patch, the
security-extended suite reports no alerts.

## Recovery

- **Codespace setup is late:** move the participant to a prewarmed repository.
- **Initial CodeQL result is late:** use the prepared reference finding and
  label it as fallback evidence.
- **Post-push CodeQL is pending:** leave the board at CI pending and use a
  reference green repository during the debrief.
- **Security tab shows a code scanning configuration error:** confirm CodeQL
  still runs in its own `codeql` job. That banner reflects the status of the
  job that ran CodeQL, not the analysis itself.
- **No workflow run appears:** check that `Security verification` is not
  disabled in **Actions → Security verification**; GitHub disables workflows
  in repositories that stay inactive.
- **Push fails:** confirm the participant is on their isolated repository and
  `main` tracks its expected upstream.
- **Board is unavailable:** nothing blocks. Registration and every phase warn,
  log locally to `app/.board-outbox.log`, and the round ends with the local
  recap. Do not claim CodeQL clean without the CI receipt.
- **A participant cannot resolve their handle:** set `BOARD_USER` in their
  Codespace terminal and rerun `npm run workshop:start`.
- **Provisioning is rate-limited:** use startup staggering only as a fallback
  to recover from observed tenant/API throttling; it is not part of the
  capacity design and does not change the 60-participant board limit.
