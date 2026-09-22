const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const { recordEvidence } = require("../src/workshop-progress");

const questions = [
  {
    prompt: "Source of untrusted data?\n  1. Request city parameter\n  2. Database result\n  3. Board alias\n> ",
    answer: "1",
  },
  {
    prompt: "SQL execution sink?\n  1. db.prepare(statement).all()\n  2. city input element\n  3. console.log()\n> ",
    answer: "1",
  },
  {
    prompt: "Unsafe data flow?\n  1. String concatenation builds SQL\n  2. JSON serialization\n  3. CSS rendering\n> ",
    answer: "1",
  },
];

async function main() {
  const supplied = (process.env.CHECKPOINT_ANSWERS || "").split(",").filter(Boolean);
  const terminal = supplied.length ? null : readline.createInterface({ input: stdin, output: stdout });
  try {
    for (const [index, question] of questions.entries()) {
      const answer = supplied[index] || (await terminal.question(question.prompt));
      if (answer.trim() !== question.answer) {
        throw new Error(`Checkpoint answer ${index + 1} is incorrect. Revisit the source, sink, and data flow.`);
      }
    }
  } finally {
    terminal?.close();
  }

  recordEvidence("purple", {
    command: "npm run checkpoint",
    result: "request city -> string-concatenated SQL -> database execution",
  });
  console.log("PASS: source, sink, and unsafe data flow confirmed.");
  console.log("Evidence recorded. Run npm run phase -- purple yourself.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Checkpoint failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main, questions };
