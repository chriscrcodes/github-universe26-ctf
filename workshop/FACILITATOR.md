# Facilitator runbook

## 45-minute agenda

| Time | Activity |
| --- | --- |
| 0:00-0:03 | Romain and Christophe: introductions and session objective |
| 0:03-0:06 | What Squad is: coordinator, specialists, routing, and human gates |
| 0:06-0:10 | Onepoint example: project context, squad composition, outcome, and the decision retained by the human |
| 0:10-0:13 | Codespace startup, board registration, and Squad initialization |
| 0:13-0:19 | Red reproduces the supplied SQL injection |
| 0:19-0:24 | Green connects runtime evidence to the prepared CodeQL finding |
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

Each participant Codespace requires these **development environment secrets**.
Provision them in the repository's **Settings → Secrets and variables →
Codespaces** page, or as organization-level Codespaces secrets with an access
policy restricted to the workshop repositories:

- `BOARD_URL`: the shared HTTPS board URL, supplied by the facilitator;
- `BOARD_TOKEN`: the participant event credential, supplied by the facilitator;
- `BOARD_TEAM_ID`: the participant's GitHub handle, in the exact lowercase
  form used by the board;
- `BOARD_SESSION_ID`: the event date in `yyyyMMdd` form, for example
  `20260922`.

The participant does not type these values, create a `.env` file, or commit
them. Codespaces injects them into the terminal environment when the
participant opens the repository. `BOARD_URL` and `BOARD_TOKEN` are secrets;
`BOARD_TEAM_ID` and `BOARD_SESSION_ID` may be ordinary Codespaces variables if
the organization prefers, but keeping all four in the same restricted
Codespaces configuration is simpler for the workshop.

Create those secrets at repository scope unless a deliberately access-policy-
restricted organization secret is approved. Repository-level values take
precedence over organization-level values; do not confuse Codespaces
development environment secrets with Actions secrets.

Each participant repository requires GitHub Actions **variables**:

- `BOARD_URL`;
- `BOARD_TEAM_ID`;
- `BOARD_SESSION_ID`.

Each participant repository also requires the Actions **secret**
`BOARD_CI_TOKEN`. It must be unique to that repository/team binding, not a
shared workshop secret. The deployed board instead requires
`BOARD_CI_BINDINGS`, a JSON object mapping each lowercase `owner/repository` to
its unique `BOARD_TEAM_ID`, and `BOARD_CI_TOKEN_KEY`, a random value of at
least 32 bytes stored only as a board secret.

For each of the 60 mappings, derive the repository's Actions secret as
lowercase hex HMAC-SHA256 using `BOARD_CI_TOKEN_KEY` over the exact UTF-8
message
`board-ci:v1\n<BOARD_SESSION_ID>\n<lowercase owner/repository>\n<BOARD_TEAM_ID>`.
Pipe the result directly to
`gh secret set BOARD_CI_TOKEN --repo owner/repository` rather than printing it.
A participant credential then fails if its workflow claims another repository
or team. Keep these Actions variables and secrets configured separately from
Codespaces secrets.

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
2. Create 60 participant repositories plus 5–10 private spares and stable
   board team identifiers.
3. Provision the Codespaces development environment secrets with the intended
   repository/organization scope and access policy.
4. Provision the Actions variables and repository secret independently.
5. Keep the advanced CodeQL workflow in the template and run it once so the
   SQL injection alert is already present before the event.
6. Confirm Code Security licensing for the private repositories and the
   expected unique active committers; private-repository Code Security usage
   is licensed, not covered by public-repository free use.
7. Apply all D1 migrations, including `0003_ci_completion.sql`.
8. Test one complete participant journey and one rejected unauthorized CI
   event.

During the workshop, the participant runs only the one-time
`npm run workshop:start` bootstrap command. After Squad is initialized, the
participant asks Squad to start the application with
`npm run workshop:app`, run the evidence checks, publish phases, and perform
the Git operations. This keeps the conversation terminal available and avoids
asking participants to memorize the workshop's internal npm commands.

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
| Started | Provisioned identity registered by `npm run workshop:start` |
| Red | Canonical local exploit returns the expected 2-to-12 boundary break |
| Purple | Source, flow, and sink checkpoint passes |
| Green | Participant approval exists and the fixed behavior check passes |
| Blue | Regression matrix passes for a clean commit pushed on `main` |
| CodeQL clean | GitHub Actions posts an authenticated CI event for that repository and SHA |

Participants control predictions, explanations, approval, and phase
publication. Scripts control measurable local facts. Only GitHub Actions can
publish the final CodeQL-clean state.

This is a collaborative 30-minute workshop, not an anti-cheat competition.
Trust participants for predictions, explanations, approval, and triggering
their phases. Keep the local checks focused on preventing accidental skips and
providing useful recovery messages; do not add signed local receipts, per-phase
server challenges, or other infrastructure that would slow down the learning
path. The authenticated GitHub Actions result remains the independent final
confirmation that the pushed revision is CodeQL clean.

## Recovery

- **Codespace setup is late:** move the participant to a prewarmed repository.
- **Initial CodeQL result is late:** use the prepared reference finding and
  label it as fallback evidence.
- **Post-push CodeQL is pending:** leave the board at CI pending and use a
  reference green repository during the debrief.
- **Push fails:** confirm the participant is on their isolated repository and
  `main` tracks its expected upstream.
- **Board is unavailable:** continue local evidence collection; do not claim
  CodeQL clean without the authenticated CI receipt.
- **Provisioning is rate-limited:** use startup staggering only as a fallback
  to recover from observed tenant/API throttling; it is not part of the
  capacity design and does not change the 60-participant board limit.
