const { recordEvidence } = require("../src/workshop-progress");
const {
  gradeAnswers,
  loadQuestionBank,
  parseAnswers,
  selectQuestions,
} = require("../src/quiz");

function parseArguments(argv) {
  const options = { answers: null, list: false };
  for (const argument of argv) {
    if (argument === "--list") options.list = true;
    else if (argument.startsWith("--answers=")) options.answers = argument.slice("--answers=".length);
  }
  return options;
}

function printQuestions(bank) {
  for (const question of selectQuestions(bank)) {
    console.log(`${question.id} [${question.topic}] ${question.prompt}`);
    for (const option of question.options) {
      console.log(`  ${option.id}. ${option.text}`);
    }
  }
}

function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const bank = loadQuestionBank();

  if (options.list) {
    printQuestions(bank);
    return;
  }

  if (!options.answers) {
    throw new Error(
      "Ask Mentor to run the understanding check. Mentor grades it with --answers=<question-id>:<option-id>,..."
    );
  }

  const result = gradeAnswers(bank, parseAnswers(options.answers));
  if (!result.passed) throw new Error(result.error);

  recordEvidence("purple", {
    command: "npm run checkpoint",
    result: "request city -> string-concatenated SQL -> database execution",
    topics: result.topics,
    gradedBy: "mentor",
  });
  console.log(`PASS: understanding confirmed across ${result.topics.join(", ")}.`);
  console.log("Evidence recorded. Publish the purple phase yourself.");
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
