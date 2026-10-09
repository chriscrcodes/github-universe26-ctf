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
    { version: 1, defaultModel: 'gpt-6-luna' },
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
  assert.match(green, /push only\s+`feature\/city-search`/i);
  assert.match(green, /does not edit or push the correction/i);
  assert.match(blue, /participant approves Green's exact\s+patch/i);
  assert.match(blue, /run `npm run verify`/);
  assert.match(blue, /open a pull request targeting\s+`main`/i);
  assert.match(blue, /explicitly\s+authorizes the merge/i);
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
        defaultModel: 'gpt-6-luna',
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
  assert.match(combined, /Green later proposes the exact correction but does\s+not edit or push it/);
  assert.match(combined, /exact patch/i);
  assert.match(combined, /participant.*approv/i);
  assert.match(combined, /Blue applies only the participant-approved correction|Work only on the participant-approved correction/i);
  assert.match(combined, /push(?:ing)? only\s+`feature\/city-search`/i);
  assert.match(combined, /pull request targeting\s+`main`/i);
  assert.match(combined, /Never push directly to `main`/i);
  assert.match(combined, /Red is read-only|Red never edits code|Never edit code/i);
  assert.doesNotMatch(combined, /Mentor/);
  assert.match(combined, /without a quiz|no quiz is required/);
  assert.match(combined, /participant chooses the next task/i);
  assert.match(combined, /never deliberately introduce a defect/i);
  assert.match(combined, /do not.*automate exploitation|never.*automate exploitation|automate exploitation/i);
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
  writeFileSync(path.join(squad, 'decisions.md'), 'Participant-owned decisions.\n');
  const before = treeDigest(squad);
  assert.notEqual(runInstaller(participant).status, 0);
  assert.equal(treeDigest(squad), before);
  writeFileSync(registry, JSON.stringify({ agents: { ...agents, mentor: { persistent_name: 'Mentor', status: 'active' } } }));
  const incompatible = treeDigest(squad);
  assert.notEqual(runInstaller(participant, ['--adopt-recruited']).status, 0);
  assert.equal(treeDigest(squad), incompatible);
  writeFileSync(registry, JSON.stringify({ agents }));
  const adopted = runInstaller(participant, ['--adopt-recruited']);
  assert.equal(adopted.status, 0, adopted.stderr);
  for (const slug of ['blue', 'red', 'green']) {
    assert.equal(readFileSync(path.join(squad, 'agents', slug, 'history.md'), 'utf8'), `Participant recruited ${slug}.\n`);
  }
  assert.equal(readFileSync(path.join(squad, 'decisions.md'), 'utf8'), 'Participant-owned decisions.\n');
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
