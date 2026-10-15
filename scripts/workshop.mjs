import { createRequire } from "node:module";
import { createInterface } from "node:readline/promises";

const require = createRequire(import.meta.url);
const { main: publishPhase } = require("../app/scripts/publish-phase.js");

const phases = new Set(["red", "purple", "green", "blue", "codeql"]);

async function main(args = process.argv.slice(2)) {
  if (args.length !== 2 || args[0] !== "phase" || !phases.has(args[1])) {
    throw new Error("Usage: npm run phase -- <red|purple|green|blue|codeql>.");
  }

  const phase = args[1];
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  try {
    answer = await prompt.question(`Publish phase ${phase} to the scoreboard? [y/N] `);
  } finally {
    prompt.close();
  }

  if (!/^y(?:es)?$/i.test(answer.trim())) {
    console.log(`Phase ${phase} was not published.`);
    return;
  }

  process.argv[2] = phase;
  await publishPhase();
}

main().catch((error) => {
  console.error(`Workshop command failed: ${error.message}`);
  process.exitCode = 1;
});