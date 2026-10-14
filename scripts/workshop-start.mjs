import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function resolveWorkshopBoardUser(env) {
  const configuredUser = typeof env.BOARD_USER === "string" ? env.BOARD_USER.trim() : "";
  const isValidHandle = (value) => value.length >= 3 && value.length <= 80
    && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(value);
  const participantBoardUser = (value) => {
    if (typeof value !== "string") return "";
    const name = value.trim().split("/").at(-1) || "";
    const participantId = name.match(/^us\d+m(\d+)(?:[-_]|$)/i);
    const mappedUser = participantId ? `u${participantId[1]}` : "";
    return isValidHandle(mappedUser) ? mappedUser : "";
  };
  const legacyTeamId = configuredUser.match(/^us(\d+)$/i);
  if (legacyTeamId) {
    const mappedUser = `u${legacyTeamId[1]}`;
    if (isValidHandle(mappedUser)) return mappedUser;
  }
  const configuredParticipant = participantBoardUser(configuredUser);
  if (configuredParticipant) return configuredParticipant;
  if (!legacyTeamId && isValidHandle(configuredUser)) return configuredUser;

  for (const source of [env.GITHUB_REPOSITORY, env.GITHUB_USER, env.GITHUB_ACTOR]) {
    const mappedParticipant = participantBoardUser(source);
    if (mappedParticipant) return mappedParticipant;
  }

  const githubUser = [env.GITHUB_USER, env.GITHUB_ACTOR]
    .find((value) => typeof value === "string" && isValidHandle(value.trim()));
  if (githubUser) return githubUser.trim();

  return isValidHandle(configuredUser) ? configuredUser : "";
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
  const participantEnv = { ...env };
  if (boardUser) participantEnv.BOARD_USER = boardUser;
  else delete participantEnv.BOARD_USER;
  const steps = [
    [process.execPath, [resolve(root, "scripts/install-workshop-squad.mjs"), "--adopt-recruited"]],
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
