const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { answerHash, loadQuestionBank, selectQuestions, seededRandom } = require("../src/quiz");

const script = path.resolve(__dirname, "../scripts/checkpoint.js");
const bank = loadQuestionBank();

function answersFor(phase, seed, wrong = false) {
  return selectQuestions(bank, phase, seededRandom(seed)).map((question, index) => {
    const sourceQuestion = bank.questions.find((candidate) => candidate.id === question.id);
    const correct = question.options.find((option) => (
      answerHash(bank.salt, question.id, option.id) === sourceQuestion.answerHash
    ));
    const option = wrong && index === 1
      ? question.options.find((candidate) => candidate.id !== correct.id)
      : correct;
    return `${question.id}:${option.id}`;
  }).join(",");
}

function runCheckpoint(args, teamId = "participant-one", extraEnv = {}, fromRoot = false) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "workshop-checkpoint-"));
  const stateFile = path.join(directory, ".team-state.json");
  fs.writeFileSync(stateFile, `${JSON.stringify({
    teamId,
    sessionId: "20260922",
    alias: "Purple Team",
    evidence: {},
    completedPhases: ["started", "red"],
  })}\n`);
  const result = spawnSync(fromRoot ? "npm" : process.execPath, fromRoot ? ["run", "checkpoint", "--", ...args] : [script, ...args], {
    cwd: path.resolve(__dirname, "../.."),
    encoding: "utf8",
    env: { ...process.env, TEAM_STATE_FILE: stateFile, ...extraEnv },
  });
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  fs.rmSync(directory, { recursive: true, force: true });
  return { result, state };
}

test("root checkpoint alias forwards explicit phase and list arguments", () => {
  const { result } = runCheckpoint(["--list", "--phase=red"], "participant-one", {}, true);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CHECKPOINT red/);
});

test("the phase checkpoint records a revalidatable receipt after the selected answers pass", () => {
  const seed = "participant-one";
  const { result, state } = runCheckpoint([
    "--phase=purple",
    `--seed=${seed}`,
    `--answers=${answersFor("purple", seed)}`,
  ]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /purple checkpoint confirmed/);
  assert.equal(state.checkpoints.purple.passed, true);
  assert.equal(state.checkpoints.purple.seed, seed);
  assert.equal(state.checkpoints.purple.questionIds.length, 3);
  assert.ok(state.checkpoints.purple.answerHashes.every((answer) => !("optionId" in answer)));
  assert.equal(state.evidence.purple.gradedBy, "checkpoint-program");
});

test("the phase checkpoint reveals and records a coaching correction after an incorrect answer", () => {
  const seed = "participant-one";
  const selectedQuestions = selectQuestions(bank, "purple", seededRandom(seed));
  const coachedQuestion = selectedQuestions[1];
  const correctOption = coachedQuestion.options.find((option) => (
    answerHash(bank.salt, coachedQuestion.id, option.id)
      === bank.questions.find((question) => question.id === coachedQuestion.id).answerHash
  ));
  const { result, state } = runCheckpoint([
    "--phase=purple",
    `--seed=${seed}`,
    `--answers=${answersFor("purple", seed, true)}`,
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`MENTOR COACHING: ${coachedQuestion.id}: correct answer is ${correctOption.id}`));
  assert.match(result.stdout, /PASS: purple coached checkpoint confirmed/);
  assert.equal(state.checkpoints.purple.passed, true);
  assert.deepEqual(state.checkpoints.purple.coachedQuestions, [coachedQuestion.id]);
  assert.equal(state.checkpoints.purple.answerHashes.find((answer) => answer.questionId === coachedQuestion.id).answerHash,
    bank.questions.find((question) => question.id === coachedQuestion.id).answerHash);
});

test("the phase checkpoint requires exactly the deterministic question set", () => {
  const seed = "participant-one";
  const selected = answersFor("purple", seed).split(",");
  const incomplete = runCheckpoint([
    "--phase=purple",
    `--seed=${seed}`,
    `--answers=${selected.slice(0, 2).join(",")}`,
  ]);
  assert.equal(incomplete.result.status, 1);
  assert.match(incomplete.result.stderr, /exactly 3 selected questions/);

  const incorrectSet = runCheckpoint([
    "--phase=purple",
    `--seed=${seed}`,
    `--answers=${selected.join(",")},source-entry:b`,
  ]);
  assert.equal(incorrectSet.result.status, 1);
  assert.match(incorrectSet.result.stderr, /exactly 3 selected questions/);
});

test("the understanding check cannot be passed without Mentor grading the answers", () => {
  const { result } = runCheckpoint([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Ask Mentor/);
});

test("Mentor can list a randomized set of questions without the answers", () => {
  const { result } = runCheckpoint(["--list", "--phase=purple"]);
  assert.equal(result.status, 0);
  const lines = result.stdout.trim().split("\n").filter((line) => !line.startsWith("  ") && !line.startsWith("CHECKPOINT"));
  assert.equal(lines.length, 3);
  assert.doesNotMatch(result.stdout, /answerHash/);
});

test("Mentor can check each answer immediately and reveal the correct option after a miss", () => {
  const seed = "participant-one";
  const question = selectQuestions(bank, "purple", seededRandom(seed))[0];
  const sourceQuestion = bank.questions.find((candidate) => candidate.id === question.id);
  const correctOption = question.options.find((option) => (
    answerHash(bank.salt, question.id, option.id) === sourceQuestion.answerHash
  ));
  const wrongOption = question.options.find((option) => option.id !== correctOption.id);

  const checked = runCheckpoint(["--phase=purple", `--seed=${seed}`, `--check=${question.id}:${wrongOption.id}`]);
  assert.equal(checked.result.status, 0);
  assert.match(checked.result.stdout, new RegExp(`MENTOR COACHING: ${question.id}: correct answer is ${correctOption.id}`));
  assert.match(checked.result.stdout, new RegExp(correctOption.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const correct = runCheckpoint(["--phase=purple", `--seed=${seed}`, `--check=${question.id}:${correctOption.id}`]);
  assert.equal(correct.result.status, 0);
  assert.match(correct.result.stdout, /ANSWER CORRECT/);
});

test("each checked answer prints the next question so Mentor never relists the quiz", () => {
  const seed = "participant-one";
  const selected = selectQuestions(bank, "purple", seededRandom(seed));
  const [first, second, third] = selected;

  const afterFirst = runCheckpoint(["--phase=purple", `--seed=${seed}`, `--check=${first.id}:a`]);
  assert.equal(afterFirst.result.status, 0);
  assert.match(afterFirst.result.stdout, new RegExp(`NEXT QUESTION 2/3:\\n${second.id} \\[`));
  second.options.forEach((option) => assert.ok(afterFirst.result.stdout.includes(`  ${option.id}. ${option.text}`)));
  assert.doesNotMatch(afterFirst.result.stdout, /answerHash/);

  const afterLast = runCheckpoint(["--phase=purple", `--seed=${seed}`, `--check=${third.id}:a`]);
  assert.equal(afterLast.result.status, 0);
  assert.match(afterLast.result.stdout, /ALL 3 QUESTIONS ANSWERED: record the receipt with --answers=/);
  assert.doesNotMatch(afterLast.result.stdout, /NEXT QUESTION/);
});

test("Mentor question selection is deterministic for a participant seed", () => {
  const first = runCheckpoint(["--list", "--phase=purple", "--seed=participant-one"]);
  const second = runCheckpoint(["--list", "--phase=purple", "--seed=participant-one"]);
  const other = runCheckpoint(["--list", "--phase=purple", "--seed=participant-two"], "participant-two");
  assert.equal(first.result.status, 0);
  assert.equal(first.result.stdout, second.result.stdout);
  assert.notEqual(first.result.stdout, other.result.stdout);
});

test("each phase has its own three-question checkpoint", () => {
  for (const phase of ["red", "purple", "green", "blue"]) {
    const { result } = runCheckpoint(["--list", `--phase=${phase}`]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`^CHECKPOINT ${phase}`, "m"));
    assert.equal(result.stdout.split("\n").filter((line) => /^[a-z-]+ \[/.test(line)).length, 3);
  }
});

test("the checkpoint rejects a question without exactly three unique options", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "workshop-quiz-bank-"));
  const bankFile = path.join(directory, "questions.json");
  const malformed = JSON.parse(JSON.stringify(bank));
  malformed.questions[0].options.pop();
  fs.writeFileSync(bankFile, `${JSON.stringify(malformed)}\n`);

  const { result } = runCheckpoint(["--list", "--phase=red"], "participant-one", {
    QUIZ_BANK_FILE: bankFile,
  });
  fs.rmSync(directory, { recursive: true, force: true });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /question .* is invalid/);
});
