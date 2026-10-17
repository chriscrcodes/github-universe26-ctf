import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const installer = path.join(repoRoot, 'scripts', 'install-workshop-squad.mjs');
const presetRoot = path.join(repoRoot, 'workshop', 'squad');

function makeParticipant(t) {
  const root = mkdtempSync(path.join(testDir, '.squad-init-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function runInstaller(root, options = []) {
  return spawnSync(process.execPath, [installer, '--root', root, ...options], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function filesBelow(root, current = root) {
  const files = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...filesBelow(root, fullPath));
    else files.push(path.relative(root, fullPath));
  }
  return files.sort();
}

function treeDigest(root) {
  const hash = createHash('sha256');
  for (const relativePath of filesBelow(root)) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(readFileSync(path.join(root, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

test('installs the complete workshop roster into an absent .squad', (t) => {
  const participant = makeParticipant(t);
  const result = runInstaller(participant);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Installed workshop Squad 5 for Squad 1\.0\.0/);

  const registry = JSON.parse(
    readFileSync(path.join(participant, '.squad', 'casting', 'registry.json'), 'utf8'),
  );
  assert.deepEqual(Object.keys(registry.agents), [
    'blue',
    'red',
    'green',
    'scribe',
    'ralph',
    'rai-agent',
    'fact-checker',
  ]);

  for (const slug of ['blue', 'red', 'green']) {
    assert.ok(
      existsSync(path.join(participant, '.squad', 'agents', slug, 'charter.md')),
      `${slug} charter should exist`,
    );
    assert.ok(
      existsSync(path.join(participant, '.squad', 'agents', slug, 'history.md')),
      `${slug} history should exist`,
    );
  }
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(participant, '.squad', 'config.json'), 'utf8')),
    { version: 1, defaultModel: 'mai-code-1.1-flash' },
  );

  const green = readFileSync(
    path.join(participant, '.squad', 'agents', 'green', 'charter.md'),
    'utf8',
  );
  const blue = readFileSync(
    path.join(participant, '.squad', 'agents', 'blue', 'charter.md'),
    'utf8',
  );
  const red = readFileSync(
    path.join(participant, '.squad', 'agents', 'red', 'charter.md'),
    'utf8',
  );
  assert.match(green, /Produce the exact minimal parameterized-query patch/);
  assert.match(blue, /push only\s+`feature\/city-search`/i);
  assert.match(blue, /participant reviews the matching CodeQL finding and approves\s+Green's exact patch/i);
  assert.match(green, /does not edit or push the correction/i);
  assert.match(blue, /run `npm run verify`/);
  assert.match(blue, /open a pull request targeting\s+`main`/i);
  assert.match(blue, /separately authorizes a merge/i);
  assert.match(red, /Never edit code/);

  const team = readFileSync(path.join(participant, '.squad', 'team.md'), 'utf8');
  assert.doesNotMatch(team, /Mentor/);
  assert.equal(existsSync(path.join(participant, '.squad', 'agents', 'mentor')), false);
});

test('is byte-for-byte idempotent for managed participant state', (t) => {
  const participant = makeParticipant(t);
  const first = runInstaller(participant);
  assert.equal(first.status, 0, first.stderr);
  const firstDigest = treeDigest(path.join(participant, '.squad'));

  const second = runInstaller(participant);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(treeDigest(path.join(participant, '.squad')), firstDigest);
});

test('reinstallation preserves learned history, decisions, policies and participant configuration', (t) => {
  const participant = makeParticipant(t);
  const first = runInstaller(participant);
  assert.equal(first.status, 0, first.stderr);
  const changes = new Map([
    ['agents/blue/history.md', '# History\n\nParticipant-owned learning.\n'],
    ['decisions.md', '# Decisions\n\nPreserve public listings.\n'],
    ['config.json', '{"version":1,"defaultModel":"participant-selected","customSetting":"preserve"}\n'],
    ['casting/history.json', '{"participant":"casting history"}\n'],
    ['rai/audit-trail.md', '# Audit\n\nExisting review.\n'],
    ['memory/index.json', '[{"id":"existing-memory"}]\n'],
  ]);
  for (const [relativePath, content] of changes) {
    writeFileSync(path.join(participant, '.squad', relativePath), content);
  }
  const second = runInstaller(participant);
  assert.equal(second.status, 0, second.stderr);
  for (const [relativePath, content] of changes) {
    const actual = readFileSync(path.join(participant, '.squad', relativePath), 'utf8');
    if (relativePath === 'config.json') {
      assert.deepEqual(JSON.parse(actual), {
        version: 1,
        defaultModel: 'mai-code-1.1-flash',
        customSetting: 'preserve',
      });
    } else {
      assert.equal(actual, content, relativePath);
    }
  }
});

test('overlays a fresh Squad while preserving unmanaged Squad-owned files', (t) => {
  const participant = makeParticipant(t);
  const squad = path.join(participant, '.squad');
  mkdirSync(path.join(squad, 'casting'), { recursive: true });
  mkdirSync(path.join(squad, 'agents', 'scribe'), { recursive: true });
  mkdirSync(path.join(squad, 'agents', 'Rai'), { recursive: true });
  mkdirSync(path.join(squad, 'templates'), { recursive: true });
  writeFileSync(path.join(squad, 'casting', 'registry.json'), '{"agents":{}}\n');
  writeFileSync(path.join(squad, 'agents', 'scribe', 'charter.md'), 'fresh init\n');
  writeFileSync(path.join(squad, 'agents', 'Rai', 'charter.md'), 'legacy built-in\n');
  writeFileSync(path.join(squad, 'templates', 'keep.md'), 'Squad-owned template\n');

  const result = runInstaller(participant);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(path.join(squad, 'templates', 'keep.md'), 'utf8'),
    'Squad-owned template\n',
  );
  assert.equal(
    readFileSync(path.join(squad, 'agents', 'scribe', 'charter.md'), 'utf8'),
    'fresh init\n',
  );
  assert.equal(existsSync(path.join(squad, 'agents', 'Rai')), false);

  const registry = JSON.parse(
    readFileSync(path.join(squad, 'casting', 'registry.json'), 'utf8'),
  );
  const agentDirectories = readdirSync(path.join(squad, 'agents'), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(agentDirectories, ['blue', 'green', 'red', 'scribe']);
});

test('refuses to overwrite an existing custom squad', (t) => {
  const participant = makeParticipant(t);
  const registryPath = path.join(participant, '.squad', 'casting', 'registry.json');
  const customRaiPath = path.join(
    participant,
    '.squad',
    'agents',
    'Rai',
    'charter.md',
  );
  mkdirSync(path.dirname(registryPath), { recursive: true });
  mkdirSync(path.dirname(customRaiPath), { recursive: true });
  const original = '{"agents":{"custom":{"status":"active"}}}\n';
  writeFileSync(registryPath, original);
  writeFileSync(customRaiPath, 'custom Rai\n');

  const result = runInstaller(participant);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing to overwrite participant team state/);
  assert.equal(readFileSync(registryPath, 'utf8'), original);
  assert.equal(readFileSync(customRaiPath, 'utf8'), 'custom Rai\n');
  assert.equal(
    existsSync(path.join(participant, '.squad', 'workshop-preset.json')),
    false,
  );
});

test('portable preset definitions enforce the workshop role boundary', () => {
  const files = [
    path.join(presetRoot, 'routing.md'),
    path.join(presetRoot, 'contracts', 'blue.md'),
    path.join(presetRoot, 'contracts', 'green.md'),
    path.join(presetRoot, 'contracts', 'red.md'),
  ].map((file) => readFileSync(file, 'utf8'));

  const combined = files.join('\n');
  assert.match(combined, /propose the exact patch but do not edit or push it/i);
  assert.match(combined, /exact patch/i);
  assert.match(combined, /participant.*approv/i);
  assert.match(combined, /participant-approved correction/i);
  assert.match(combined, /push(?:ing)? only\s+`feature\/city-search`/i);
  assert.match(combined, /pull request targeting\s+`main`/i);
  assert.match(combined, /Never push directly to `main`/i);
  assert.match(combined, /Red is read-only|Red never edits code|Never edit code/i);
  assert.doesNotMatch(combined, /Mentor/);
  assert.match(combined, /without a quiz|no quiz is required/i);
  assert.match(combined, /participant chooses (?:the next|each) task/i);
  assert.match(combined, /never deliberately introduce a defect/i);
  assert.match(combined, /do not.*automate exploitation|never.*automate exploitation|automate exploitation/i);
  assert.match(combined, /Never offer a\s+follow-up action menu, remediation options or a committed findings summary/i);
});

test('explicit adoption preserves recruited agent learning and requires the exact workshop roster', (t) => {
  const participant = makeParticipant(t);
  const squad = path.join(participant, '.squad');
  mkdirSync(path.join(squad, 'casting'), { recursive: true });
  const agents = {};
  for (const slug of ['blue', 'red', 'green']) {
    agents[slug] = { persistent_name: slug[0].toUpperCase() + slug.slice(1), status: 'active' };
    mkdirSync(path.join(squad, 'agents', slug), { recursive: true });
    writeFileSync(path.join(squad, 'agents', slug, 'history.md'), `Participant recruited ${slug}.\n`);
  }
  const registry = path.join(squad, 'casting', 'registry.json');
  writeFileSync(registry, JSON.stringify({ agents }));
  writeFileSync(path.join(squad, 'team.md'), [
    '# Squad Team',
    '',
    '## Members',
    '',
    '| Name | Role | Charter | Status |',
    '|------|------|---------|--------|',
    '| Purple | Workshop validation reviewer | | 👤 Human |',
    '',
  ].join('\n'));
  writeFileSync(path.join(squad, 'decisions.md'), 'Participant-owned decisions.\n');
  const before = treeDigest(squad);
  assert.notEqual(runInstaller(participant).status, 0);
  assert.equal(treeDigest(squad), before);
  writeFileSync(registry, JSON.stringify({ agents: { ...agents, mentor: { persistent_name: 'Mentor', status: 'active' } } }));
  const incompatible = treeDigest(squad);
  const rejected = runInstaller(participant, ['--adopt-recruited']);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /unexpected registry agent "mentor"/);
  assert.match(rejected.stderr, /Preserve \.squad\//);
  assert.equal(treeDigest(squad), incompatible);
  writeFileSync(registry, JSON.stringify({
    agents: { ...agents, purple: { persistent_name: 'Purple AI', status: 'active' } },
  }));
  const agentTeam = treeDigest(squad);
  const rejectedPurple = runInstaller(participant, ['--adopt-recruited']);
  assert.notEqual(rejectedPurple.status, 0);
  assert.match(rejectedPurple.stderr, /registry agent "purple" must have persistent_name "Purple"/);
  assert.equal(treeDigest(squad), agentTeam);
  writeFileSync(registry, JSON.stringify({ agents: { ...agents, purple: { persistent_name: 'Purple', status: 'active' } } }));
  const adopted = runInstaller(participant, ['--adopt-recruited']);
  assert.equal(adopted.status, 0, adopted.stderr);
  for (const slug of ['blue', 'red', 'green']) {
    assert.equal(readFileSync(path.join(squad, 'agents', slug, 'history.md'), 'utf8'), `Participant recruited ${slug}.\n`);
  }
  assert.equal(readFileSync(path.join(squad, 'decisions.md'), 'utf8'), 'Participant-owned decisions.\n');
  const team = readFileSync(path.join(squad, 'team.md'), 'utf8');
  assert.match(team, /\| Purple \| Workshop validation reviewer \| \| 👤 Human \|/);
  assert.equal(existsSync(path.join(squad, 'agents', 'purple')), false);
  assert.equal(JSON.parse(readFileSync(registry, 'utf8')).agents.purple, undefined);
  const readopted = runInstaller(participant, ['--adopt-recruited']);
  assert.equal(readopted.status, 0, readopted.stderr);
  assert.match(readFileSync(path.join(squad, 'team.md'), 'utf8'), /\| Purple \| Workshop validation reviewer \| \| 👤 Human \|/);
});

test('adoption preserves the recruited rai built-in without creating a duplicate', (t) => {
  const participant = makeParticipant(t);
  const squad = path.join(participant, '.squad');
  const agents = {};
  for (const [slug, name] of [['blue', 'Blue'], ['red', 'Red'], ['green', 'Green'], ['rai', 'Rai']]) {
    agents[slug] = { persistent_name: name, status: 'active' };
    mkdirSync(path.join(squad, 'agents', slug), { recursive: true });
  }
  mkdirSync(path.join(squad, 'casting'), { recursive: true });
  const registryPath = path.join(squad, 'casting', 'registry.json');
  writeFileSync(registryPath, JSON.stringify({ agents }));
  const charterPath = path.join(squad, 'agents', 'rai', 'charter.md');
  const historyPath = path.join(squad, 'agents', 'rai', 'history.md');
  writeFileSync(charterPath, 'Participant Rai charter.\n');
  writeFileSync(historyPath, 'Participant Rai learning.\n');

  const invalid = { ...agents, rai: { persistent_name: 'Other', status: 'active' } };
  writeFileSync(registryPath, JSON.stringify({ agents: invalid }));
  const before = treeDigest(squad);
  const rejected = runInstaller(participant, ['--adopt-recruited']);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /registry agent "rai" must have persistent_name "Rai"/);
  assert.equal(treeDigest(squad), before);
  writeFileSync(registryPath, JSON.stringify({ agents }));

  for (const options of [['--adopt-recruited'], []]) {
    const result = runInstaller(participant, options);
    assert.equal(result.status, 0, result.stderr);
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    assert.equal(registry.agents.rai.persistent_name, 'Rai');
    assert.equal(registry.agents['rai-agent'], undefined);
    assert.match(readFileSync(path.join(squad, 'team.md'), 'utf8'), /\.squad\/agents\/rai\/charter\.md/);
    assert.equal(readFileSync(charterPath, 'utf8'), 'Participant Rai charter.\n');
    assert.equal(readFileSync(historyPath, 'utf8'), 'Participant Rai learning.\n');
    assert.equal(existsSync(path.join(squad, 'agents', 'rai-agent')), false);
  }
});

test('adoption accepts the provenance registry agents array and preserves recruited learning', (t) => {
  const participant = makeParticipant(t);
  const squad = path.join(participant, '.squad');
  const roster = [
    ['Blue', 'Implementation Lead'],
    ['Red', 'Security Reviewer'],
    ['Green', 'Feature Engineer'],
    ['Purple', 'Human Validation Reviewer'],
    ['Scribe', 'Session Logger'],
    ['Ralph', 'Work Monitor'],
    ['Rai', 'RAI Reviewer'],
    ['Fact Checker', 'Verification Analyst'],
  ].map(([persistent_name, role]) => ({
    persistent_name,
    role,
    status: 'active',
    is_human: persistent_name === 'Purple',
  }));
  mkdirSync(path.join(squad, 'casting'), { recursive: true });
  mkdirSync(path.join(squad, 'agents', 'blue'), { recursive: true });
  writeFileSync(
    path.join(squad, 'casting', 'registry.json'),
    JSON.stringify({ schema: 'squad-agent-provenance/v1', agents: roster }),
  );
  writeFileSync(path.join(squad, 'agents', 'blue', 'history.md'), 'Participant learning.\n');
  writeFileSync(path.join(squad, 'decisions.md'), 'Participant-owned decisions.\n');
  writeFileSync(path.join(squad, 'team.md'), [
    '# Squad Team',
    '',
    '## Members',
    '',
    '| Name | Role | Charter | Status |',
    '|------|------|---------|--------|',
    '| Purple | Human validation reviewer | | 👤 Human |',
    '',
  ].join('\n'));

  const adopted = runInstaller(participant, ['--adopt-recruited']);

  assert.equal(adopted.status, 0, adopted.stderr);
  assert.equal(readFileSync(path.join(squad, 'agents', 'blue', 'history.md'), 'utf8'), 'Participant learning.\n');
  assert.equal(readFileSync(path.join(squad, 'decisions.md'), 'utf8'), 'Participant-owned decisions.\n');
  const registry = JSON.parse(readFileSync(path.join(squad, 'casting', 'registry.json'), 'utf8'));
  assert.equal(Array.isArray(registry.agents), false);
  assert.equal(registry.agents.blue.persistent_name, 'Blue');
  assert.equal(registry.agents.rai.persistent_name, 'Rai');
  assert.equal(registry.agents.purple, undefined);
  assert.match(readFileSync(path.join(squad, 'team.md'), 'utf8'), /\| Purple \| Human validation reviewer \| \| 👤 Human \|/);
});

test('adoption accepts a root-level Squad roster array with a human Purple member', (t) => {
  const participant = makeParticipant(t);
  const squad = path.join(participant, '.squad');
  const roster = [
    ['Blue', 'Lead', 'active', 'agent'],
    ['Red', 'Security Reviewer', 'active', 'agent'],
    ['Green', 'Security Analyst', 'active', 'agent'],
    ['Purple', 'Human Reviewer', 'human', 'human'],
    ['Scribe', 'Session Logger', 'active', 'agent'],
    ['Ralph', 'Work Monitor', 'active', 'agent'],
    ['Rai', 'RAI Reviewer', 'active', 'agent'],
    ['Fact Checker', 'Verification & Devil\'s Advocate', 'active', 'agent'],
  ].map(([persistent_name, role, status, member_type]) => ({
    persistent_name,
    role,
    universe: 'descriptive',
    created_at: '2026-10-17T06:08:57Z',
    legacy_named: false,
    status,
    member_type,
  }));
  mkdirSync(path.join(squad, 'casting'), { recursive: true });
  for (const slug of ['blue', 'red', 'green', 'scribe', 'ralph', 'rai', 'fact-checker', 'Rai']) {
    mkdirSync(path.join(squad, 'agents', slug), { recursive: true });
  }
  writeFileSync(path.join(squad, 'casting', 'registry.json'), JSON.stringify(roster));
  writeFileSync(path.join(squad, 'agents', 'blue', 'history.md'), 'Participant learning.\n');
  writeFileSync(path.join(squad, 'team.md'), [
    '# Squad Team',
    '',
    '## Members',
    '',
    '| Name | Role | Charter | Status |',
    '|------|------|---------|--------|',
    '| Purple | Human Reviewer | | 👤 Human |',
    '',
  ].join('\n'));

  const adopted = runInstaller(participant, ['--adopt-recruited']);

  assert.equal(adopted.status, 0, adopted.stderr);
  assert.equal(readFileSync(path.join(squad, 'agents', 'blue', 'history.md'), 'utf8'), 'Participant learning.\n');
  const registry = JSON.parse(readFileSync(path.join(squad, 'casting', 'registry.json'), 'utf8'));
  assert.equal(registry.agents.blue.persistent_name, 'Blue');
  assert.equal(registry.agents.rai.persistent_name, 'Rai');
  assert.equal(registry.agents.purple, undefined);
  assert.match(readFileSync(path.join(squad, 'team.md'), 'utf8'), /\| Purple \| Human Reviewer \| \| 👤 Human \|/);
});

test('adoption converts a fileless Purple registry entry to the human roster member', (t) => {
  const participant = makeParticipant(t);
  const squad = path.join(participant, '.squad');
  const agents = {};
  for (const slug of ['blue', 'red', 'green']) {
    agents[slug] = { persistent_name: slug[0].toUpperCase() + slug.slice(1), status: 'active' };
    mkdirSync(path.join(squad, 'agents', slug), { recursive: true });
  }
  agents.purple = { persistent_name: 'Purple', status: 'active' };
  mkdirSync(path.join(squad, 'casting'), { recursive: true });
  writeFileSync(path.join(squad, 'casting', 'registry.json'), JSON.stringify({ agents }));
  writeFileSync(path.join(squad, 'team.md'), [
    '# Squad Team',
    '',
    '## Members',
    '',
    '| Name | Role | Charter | Status |',
    '|------|------|---------|--------|',
    '| Blue | Implements changes | .squad/agents/blue/charter.md | active |',
    '| Red | Security reviewer | .squad/agents/red/charter.md | active |',
    '| Green | Feature developer | .squad/agents/green/charter.md | active |',
    '',
  ].join('\n'));

  const adopted = runInstaller(participant, ['--adopt-recruited']);
  assert.equal(adopted.status, 0, adopted.stderr);
  const team = readFileSync(path.join(squad, 'team.md'), 'utf8');
  assert.match(team, /\| Purple \| Human workshop validation reviewer \| \| 👤 Human \|/);
  const registry = JSON.parse(readFileSync(path.join(squad, 'casting', 'registry.json'), 'utf8'));
  assert.equal(registry.agents.purple, undefined);
  assert.equal(existsSync(path.join(squad, 'agents', 'purple')), false);
});

test('refuses to convert Purple when agent files exist', (t) => {
  const participant = makeParticipant(t);
  const squad = path.join(participant, '.squad');
  const agents = {};
  for (const slug of ['blue', 'red', 'green', 'purple']) {
    agents[slug] = {
      persistent_name: slug === 'purple' ? 'Purple' : slug[0].toUpperCase() + slug.slice(1),
      status: 'active',
    };
    mkdirSync(path.join(squad, 'agents', slug), { recursive: true });
  }
  mkdirSync(path.join(squad, 'casting'), { recursive: true });
  writeFileSync(path.join(squad, 'casting', 'registry.json'), JSON.stringify({ agents }));
  writeFileSync(path.join(squad, 'agents', 'purple', 'history.md'), 'Preserve Purple history.\n');
  const before = treeDigest(squad);

  const rejected = runInstaller(participant, ['--adopt-recruited']);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /refusing to convert its state to a human roster entry/);
  assert.equal(treeDigest(squad), before);
});

test('participant template does not ship an active Squad team', () => {
  const trackedSquad = spawnSync(
    'git',
    ['ls-files', '--cached', '--', '.squad'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  );

  assert.equal(trackedSquad.status, 0, trackedSquad.stderr);
  assert.equal(trackedSquad.stdout.trim(), '');
});

test('portable preset contains no common secret material', () => {
  const secretPatterns = [
    /[A-Z_]+(?:KEY|TOKEN|SECRET)=[^\s]+/,
    /(?:PASSWORD|PASS|PWD)[:=]\s*["']?[^\s"']+/i,
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
    /(?:ghp|github_pat)_[A-Za-z0-9_]+/,
    /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  ];

  for (const relativePath of filesBelow(presetRoot)) {
    const content = readFileSync(path.join(presetRoot, relativePath), 'utf8');
    for (const pattern of secretPatterns) {
      assert.doesNotMatch(content, pattern, `${relativePath} matched ${pattern}`);
    }
  }
});
