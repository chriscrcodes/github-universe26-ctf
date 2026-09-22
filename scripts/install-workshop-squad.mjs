#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const presetDir = path.resolve(scriptDir, '..', 'workshop', 'squad');
const builtInSlugs = new Set(['scribe', 'ralph', 'rai-agent', 'fact-checker']);
const obsoleteBuiltInDirectories = new Set(['Rai']);
const freshBuiltInDirectories = new Set([
  ...builtInSlugs,
  ...obsoleteBuiltInDirectories,
]);

function fail(message) {
  console.error(`Workshop Squad installation failed: ${message}`);
  process.exitCode = 1;
}

function parseRoot(args) {
  if (args.length === 0) return process.cwd();
  if (args.length === 2 && args[0] === '--root' && args[1]) {
    return path.resolve(args[1]);
  }
  throw new Error('usage: node scripts/install-workshop-squad.mjs [--root <repository>]');
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function isFreshOrInstalled(squadDir, preset) {
  if (!existsSync(squadDir)) return true;

  const entries = readdirSync(squadDir);
  if (entries.length === 0) return true;

  const markerPath = path.join(squadDir, 'workshop-preset.json');
  if (existsSync(markerPath)) {
    const marker = readJson(markerPath);
    return marker.id === preset.id;
  }

  const registryPath = path.join(squadDir, 'casting', 'registry.json');
  if (!existsSync(registryPath)) return false;

  const registry = readJson(registryPath);
  if (
    !registry ||
    typeof registry !== 'object' ||
    !registry.agents ||
    typeof registry.agents !== 'object' ||
    Object.keys(registry.agents).length !== 0
  ) {
    return false;
  }

  const agentsDir = path.join(squadDir, 'agents');
  if (!existsSync(agentsDir)) return true;
  return readdirSync(agentsDir).every((entry) => freshBuiltInDirectories.has(entry));
}

function validatePreset(preset) {
  if (preset.schemaVersion !== 1 || preset.squadVersion !== '0.13.1') {
    throw new Error('preset must target Squad 0.13.1 with schemaVersion 1');
  }
  if (!preset.id || !Number.isInteger(preset.version) || !Array.isArray(preset.agents)) {
    throw new Error('preset metadata is incomplete');
  }

  const slugs = new Set();
  for (const agent of preset.agents) {
    if (
      !agent.slug ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(agent.slug) ||
      agent.slug.includes('..') ||
      slugs.has(agent.slug)
    ) {
      throw new Error(`invalid or duplicate agent slug: ${agent.slug ?? '<missing>'}`);
    }
    slugs.add(agent.slug);
    const charter = path.join(presetDir, 'agents', agent.slug, 'charter.md');
    if (!existsSync(charter)) {
      throw new Error(`missing charter for ${agent.slug}`);
    }
  }

  for (const required of ['blue', 'red', 'green', ...builtInSlugs]) {
    if (!slugs.has(required)) throw new Error(`required agent is missing: ${required}`);
  }
}

function buildTeam(projectName, agents) {
  const rows = agents
    .map(
      (agent) =>
        `| ${agent.name} | ${agent.role} | .squad/agents/${agent.slug}/charter.md | active |`,
    )
    .join('\n');

  return `# Squad Team

> ${projectName}

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes workshop work and enforces approval gates. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
${rows}

## Project Context

This is the deterministic GitHub Universe purple-team workshop squad.
`;
}

function buildRegistry(preset) {
  const agents = {};
  for (const agent of preset.agents) {
    agents[agent.slug] = {
      persistent_name: agent.name,
      universe: agent.universe,
      created_at: preset.createdAt,
      legacy_named: false,
      status: 'active',
    };
  }
  return { agents };
}

function buildHistory(projectName, agent) {
  return `# Project Context

- **Project:** ${projectName}
- **Preset:** github-universe26-purple-team

## Core Context

Agent ${agent.name} is initialized with the workshop role contract.

## Recent Updates

No session updates recorded.

## Learnings

No project-specific learnings recorded.
`;
}

function stringifyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeManagedFile(root, relativePath, content) {
  const destination = path.join(root, ...relativePath.split('/'));
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, content, 'utf8');
}

function install(root, preset) {
  if (!existsSync(root)) throw new Error(`repository root does not exist: ${root}`);

  const squadDir = path.join(root, '.squad');
  if (!isFreshOrInstalled(squadDir, preset)) {
    throw new Error(
      'an existing non-fresh Squad was found; refusing to overwrite participant team state',
    );
  }

  for (const obsoleteDirectory of obsoleteBuiltInDirectories) {
    const obsoletePath = path.join(squadDir, 'agents', obsoleteDirectory);
    if (existsSync(obsoletePath)) {
      rmSync(obsoletePath, { recursive: true, force: true });
    }
  }

  const projectName = path.basename(root);
  const routing = readFileSync(path.join(presetDir, 'routing.md'), 'utf8');
  const policy = {
    casting_policy_version: '1.2',
    allow_custom_universes: true,
    default_naming: 'descriptive',
    allowlist_universes: [],
    universe_capacity: {},
  };
  const managed = new Map([
    ['.squad/config.json', stringifyJson({ version: 1 })],
    ['.squad/team.md', buildTeam(projectName, preset.agents)],
    ['.squad/routing.md', routing.endsWith('\n') ? routing : `${routing}\n`],
    ['.squad/decisions.md', '# Team Decisions\n\nNo shared decisions recorded.\n'],
    [
      '.squad/ceremonies.md',
      '# Ceremonies\n\nWorkshop roles use the approval and verification gates in routing.md.\n',
    ],
    ['.squad/casting/registry.json', stringifyJson(buildRegistry(preset))],
    ['.squad/casting/policy.json', stringifyJson(policy)],
    [
      '.squad/casting/history.json',
      stringifyJson({ universe_usage_history: [], assignment_cast_snapshots: {} }),
    ],
    [
      '.squad/rai/policy.md',
      '# RAI Policy\n\nBlock secrets, unsafe external targeting, and harmful content. Keep workshop actions local and evidence-based.\n',
    ],
    [
      '.squad/rai/audit-trail.md',
      '# RAI Audit Trail\n\n> Append-only, redacted evidence. Never record raw secrets or personal data.\n',
    ],
    [
      '.squad/fact-checker/policy.md',
      '# Fact Checker Policy\n\nVerify claims against repository evidence and label contradictions before publication.\n',
    ],
    [
      '.squad/fact-checker/audit-trail.md',
      '# Fact Checker Audit Trail\n\n> Append-only verification verdicts and citations.\n',
    ],
    [
      '.squad/memory/config.json',
      stringifyJson({
        version: 1,
        defaultProvider: 'local',
        promptOnlyFallback: true,
        externalProviders: {
          hostInjectedCopilotAdapter: { enabled: false, requireApproval: true },
        },
        policy: {
          rejectForbidden: true,
          rejectTransientDurableWrites: true,
          auditContent: false,
          auditMaxBytes: 1048576,
          auditMaxArchives: 3,
        },
      }),
    ],
    ['.squad/memory/index.json', '[]\n'],
    ['.squad/memory/audit.jsonl', ''],
    ['.squad/.first-run', `${preset.createdAt}\n`],
    [
      '.squad/workshop-preset.json',
      stringifyJson({
        schemaVersion: preset.schemaVersion,
        id: preset.id,
        version: preset.version,
        squadVersion: preset.squadVersion,
      }),
    ],
  ]);

  for (const agent of preset.agents) {
    const charter = readFileSync(
      path.join(presetDir, 'agents', agent.slug, 'charter.md'),
      'utf8',
    );
    managed.set(
      `.squad/agents/${agent.slug}/charter.md`,
      charter.endsWith('\n') ? charter : `${charter}\n`,
    );
    managed.set(
      `.squad/agents/${agent.slug}/history.md`,
      buildHistory(projectName, agent),
    );
  }

  for (const relativePath of managed.keys()) {
    if (
      relativePath.includes('.env') ||
      relativePath.includes('..') ||
      path.isAbsolute(relativePath)
    ) {
      throw new Error(`unsafe managed path: ${relativePath}`);
    }
  }

  for (const [relativePath, content] of managed) {
    writeManagedFile(root, relativePath, content);
  }

  for (const relativeDir of [
    '.squad/decisions/inbox',
    '.squad/log',
    '.squad/orchestration-log',
    '.squad/memory/local',
    '.squad/memory/policy-inbox',
    '.squad/memory/semantic-inbox',
    '.squad/memory/tombstones',
  ]) {
    mkdirSync(path.join(root, ...relativeDir.split('/')), { recursive: true });
  }

  console.log(
    `Installed workshop Squad ${preset.version} for Squad ${preset.squadVersion} in ${root}`,
  );
}

try {
  const root = parseRoot(process.argv.slice(2));
  const preset = readJson(path.join(presetDir, 'preset.json'));
  validatePreset(preset);
  install(root, preset);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
