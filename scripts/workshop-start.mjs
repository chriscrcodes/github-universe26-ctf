import { spawnSync } from "node:child_process";

const requiredCommands = [
  ["node", ["--version"]],
  ["npm", ["--version"]],
  ["git", ["--version"]],
  ["gh", ["--version"]],
  ["squad", ["--version"]],
];

for (const [command, args] of requiredCommands) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`BLOCKED: ${command} is unavailable. Rebuild the Codespace or ask a facilitator.`);
    process.exit(1);
  }
  console.log(`PASS: ${command} ${result.stdout.split("\n")[0].trim()}`);
}

if (!process.env.BOARD_URL || !process.env.BOARD_TOKEN) {
  console.warn(
    "WARN: BOARD_URL or BOARD_TOKEN is missing. The scoreboard stays offline; the capture-the-flag run continues locally."
  );
}

const register = spawnSync("npm", ["run", "register"], {
  encoding: "utf8",
  env: process.env,
  stdio: "inherit",
});
if (register.status !== 0) process.exit(register.status || 1);

console.log("");
console.log("READY: participant registered.");
console.log("Next: squad init --no-workflows");
console.log("Then: npm run squad:install-workshop-team && squad doctor");
