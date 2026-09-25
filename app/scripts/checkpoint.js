const { readWorkshopState, recordCheckpoint, recordEvidence } = require("../src/workshop-progress");
const {
  QUIZ_PHASES,
  checkAnswer,
  gradeAnswers,
  loadQuestionBank,
  parseAnswers,
  seededRandom,
  selectQuestions,
} = require("../src/quiz");

function parseArguments(argv) {
  const options = { answers: null, check: null, list: false, phase: null, seed: null };
  for (const argument of argv) {
    if (argument === "--list") options.list = true;
    else if (argument.startsWith("--answers=")) options.answers = argument.slice("--answers=".length);
    else if (argument.startsWith("--check=")) options.check = argument.slice("--check=".length);
    else if (argument.startsWith("--phase=")) options.phase = argument.slice("--phase=".length);
    else if (argument.startsWith("--seed=")) options.seed = argument.slice("--seed=".length);
  }
  return options;
}

function printQuestions(bank, phase, seed) {
  console.log(`CHECKPOINT ${phase}`);
  for (const question of selectQuestions(bank, phase, seededRandom(seed))) {
    console.log(`${question.id} [${question.topic}] ${question.prompt}`);
    for (const option of question.options) {
      console.log(`  ${option.id}. ${option.text}`);
    }
  }
}

function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const bank = loadQuestionBank();
  const state = readWorkshopState();
  const nextPhase = QUIZ_PHASES[state.completedPhases.length - 1];
  const phase = options.phase || nextPhase;
  const seed = options.seed || process.env.BOARD_TEAM_ID || state.teamId;
  if (!phase || !QUIZ_PHASES.includes(phase)) {
    throw new Error(`Expected a quiz phase from ${QUIZ_PHASES.join(", ")}.`);
  }
  if (seed !== state.teamId) {
    throw new Error("The quiz seed must match the registered participant team ID.");
  }

  if (options.list) {
    printQuestions(bank, phase, seed);
    return;
  }

  if (options.check) {
    const answers = parseAnswers(options.check);
    if (answers.length !== 1) throw new Error("Check exactly one answer with --check=<question-id>:<option-id>.");
    const result = checkAnswer(bank, answers[0].questionId, answers[0].optionId, { phase, seed });
    if (result.error) throw new Error(result.error);
    if (result.correct) console.log(`ANSWER CORRECT: ${answers[0].questionId}. Continue to the next question.`);
    else console.log(`MENTOR COACHING: ${answers[0].questionId}: correct answer is ${result.correctOptionId}. ${result.correctOptionText}`);
    return;
  }

  if (!options.answers) {
    throw new Error(
      "Ask Mentor to run the understanding check in Squad. Mentor grades it with --answers=<question-id>:<option-id>,..."
    );
  }

  const result = gradeAnswers(bank, parseAnswers(options.answers), { phase, seed });
  if (!result.passed) throw new Error(result.error);

  for (const correction of result.coached) {
    console.log(`MENTOR COACHING: ${correction.questionId}: correct answer is ${correction.correctOptionId}. ${correction.correctOptionText}`);
  }
  const receipt = {
    version: 1,
    phase,
    seed,
    questionIds: result.questionIds,
    answerHashes: result.answerHashes,
    topics: result.topics,
    coachedQuestions: result.coached.map((correction) => correction.questionId),
    passed: true,
    recordedAt: new Date().toISOString(),
  };
  recordCheckpoint(phase, receipt);
  if (phase === "purple") recordEvidence("purple", {
    command: "npm run checkpoint",
    result: "request city -> string-concatenated SQL -> database execution",
    topics: result.topics,
    gradedBy: "checkpoint-program",
  });
  const checkpointMode = result.coached.length ? "coached checkpoint" : "checkpoint";
  console.log(`PASS: ${phase} ${checkpointMode} confirmed across ${result.topics.join(", ")}.`);
  console.log(`Checkpoint recorded. Mentor asks whether ${phase} is ready; Squad publishes only after participant agreement and all evidence checks.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Checkpoint failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { main, parseArguments };
