import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function resolveWorkshopBoardUser(env) {
  const configuredUser = typeof env.BOARD_USER === "string" ? env.BOARD_USER.trim() : "";
  const legacyTeamId = configuredUser.match(/^us(\d+)$/i);
  if (legacyTeamId) return `u${legacyTeamId[1]}`;
  if (configuredUser && !configuredUser.includes("/")) return configuredUser;

  const repository = [env.GITHUB_REPOSITORY, env.GITHUB_USER, env.BOARD_USER].find(
    (value) => typeof value === "string" && value.includes("/")
  );
  const repositoryName = repository?.trim().split("/").at(-1) || "";
  const participantId = repositoryName.match(/^us\d+m(\d+)(?:-|$)/i);
  return participantId ? `u${participantId[1]}` : configuredUser;
}

const requiredCommands = [
  ["node", ["--version"]],
  ["npm", ["--version"]],
  ["git", ["--version"]],
  ["gh", ["--version"]],
  ["squad", ["--version"]],
];

export function startWorkshop(env = process.env, run = spawnSync) {
  const root = resolve(import.meta.dirname, "..");
  for (const [command, args] of requiredCommands) {
    const result = run(command, args, { encoding: "utf8", env, cwd: root });
    if (result.status !== 0) {
      console.error(`BLOCKED: ${command} is unavailable. Rebuild the Codespace or ask a facilitator.`);
      return 1;
    }
    console.log(`PASS: ${command} ${result.stdout.split("\n")[0].trim()}`);
  }

  if (!env.BOARD_URL || !env.BOARD_TOKEN) {
    console.warn(
      "WARN: BOARD_URL or BOARD_TOKEN is missing. The scoreboard stays offline; the capture-the-flag run continues locally."
    );
  }

  const boardUser = resolveWorkshopBoardUser(env);
  const participantEnv = { ...env, ...(boardUser ? { BOARD_USER: boardUser } : {}) };
  const steps = [
    [process.execPath, [resolve(root, "scripts/install-workshop-squad.mjs"), "--adopt-recruited"]],
    ["squad", ["doctor"]],
    ["npm", ["run", "register"]],
    [process.execPath, [resolve(root, "scripts/start-workshop-app.mjs")]],
  ];
  for (const [command, args] of steps) {
    const result = run(command, args, { encoding: "utf8", env: participantEnv, cwd: root, stdio: "inherit" });
    if (result.status !== 0) {
      console.error("BLOCKED: startup stopped. Resolve the reported problem; no next workshop task was started.");
      return result.status || 1;
    }
  }

  console.log("");
  console.log("READY: participant registered and workshop app launched.");
  console.log(`Open http://127.0.0.1:${env.PORT || 3000} (use private port forwarding in Codespaces).`);
  console.log("Return to the same Squad conversation. Ask Blue to integrate app/data/city-search-prototype.txt for the isolated synthetic challenge.");
  console.log("Review each result yourself. No commit, push or phase is automatically authorized.");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = startWorkshop();
}
