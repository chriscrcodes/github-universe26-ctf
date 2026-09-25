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

function runInstaller(root) {
  return spawnSync(process.execPath, [installer, '--root', root], {
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
  assert.match(result.stdout, /Installed workshop Squad 2 for Squad 0\.13\.1/);

  const squadConfig = JSON.parse(
    readFileSync(path.join(participant, '.squad', 'config.json'), 'utf8'),
  );
  assert.equal(squadConfig.defaultModel, 'gpt-6-luna');

  const registry = JSON.parse(
    readFileSync(path.join(participant, '.squad', 'casting', 'registry.json'), 'utf8'),
  );
  assert.deepEqual(Object.keys(registry.agents), [
    'blue',
    'red',
    'green',
    'mentor',
    'scribe',
    'ralph',
    'rai-agent',
    'fact-checker',
  ]);

  for (const slug of Object.keys(registry.agents)) {
    assert.ok(
      existsSync(path.join(participant, '.squad', 'agents', slug, 'charter.md')),
      `${slug} charter should exist`,
    );
    assert.ok(
      existsSync(path.join(participant, '.squad', 'agents', slug, 'history.md')),
      `${slug} history should exist`,
    );
  }

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
  assert.match(green, /Only after explicit participant approval[\s\S]*implement that exact patch/);
  assert.doesNotMatch(green, /never edits code, even after approval/i);
  assert.match(blue, /application startup and delivery/i);
  assert.match(blue, /push `main`[\s\S]*Only after the push[\s\S]*npm run regressions/);
  assert.match(blue, /run `npm run verify`/);
  assert.match(blue, /push `main`/);
  assert.match(red, /Never edit code/);

  const mentor = readFileSync(
    path.join(participant, '.squad', 'agents', 'mentor', 'charter.md'),
    'utf8',
  );
  assert.match(mentor, /After each answer[\s\S]*--check=<question-id>:<option-id>/);
  assert.match(mentor, /give the participant the returned[\s\S]*correct option/i);
  assert.match(mentor, /--answers=/);
  assert.match(mentor, /one Squad conversation/);
  assert.match(mentor, /what they observe[\s\S]*Wait/);
  assert.match(mentor, /API success is not human confirmation/);
  assert.match(mentor, /--phase=purple --confirm --analysis=ID --commit=SHA/);
  assert.match(mentor, /--phase=blue --confirm --analysis=ID --commit=SHA/);
  assert.match(mentor, /--list --phase=<phase>` once/);
  assert.match(mentor, /do\s+not run `--list` again/);
  assert.match(mentor, /Always route to Green next, even when the report is inaccessible/);
  assert.match(green, /Do not edit any file before that output/);
  assert.match(green, /npm run workshop:app -- --restart/);
  const routing = readFileSync(path.join(participant, '.squad', 'routing.md'), 'utf8');
  assert.match(routing, /Return to Mentor/);
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
  assert.match(
    readFileSync(path.join(squad, 'agents', 'scribe', 'charter.md'), 'utf8'),
    /Session Logger and Memory Manager/,
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
  assert.deepEqual(agentDirectories, Object.keys(registry.agents).sort());
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
    path.join(presetRoot, 'agents', 'blue', 'charter.md'),
    path.join(presetRoot, 'agents', 'green', 'charter.md'),
    path.join(presetRoot, 'agents', 'red', 'charter.md'),
    path.join(presetRoot, 'agents', 'mentor', 'charter.md'),
  ].map((file) => readFileSync(file, 'utf8'));

  const combined = files.join('\n');
  assert.match(files[2], /Green never edits before approval/);
  assert.match(combined, /exact patch/i);
  assert.match(combined, /participant.*approv/i);
  assert.match(files[1], /only Green's approved, verified change/i);
  assert.match(combined, /push(?:es)? `main`|push `main`/i);
  assert.match(combined, /Red is read-only|Red never edits code|Never edit code/i);
  assert.match(combined, /Mentor guides the participant throughout the workshop[\s\S]*Purple, Green and Blue/);
  assert.match(combined, /Red publishes\s+automatically/);
  assert.match(combined, /Mentor never edits code/);
});

test('workshop sequencing override lives outside generated coordinator capabilities', () => {
  const coordinator = readFileSync(path.join(repoRoot, '.github/agents/squad.agent.md'), 'utf8');
  const override = coordinator.indexOf('## Workshop Participant Journey Override');
  assert.ok(override > coordinator.indexOf('<!-- SQUAD:TEAM-CAPABILITIES:END -->'));
  assert.match(coordinator.slice(override), /Never advance automatically/);
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
