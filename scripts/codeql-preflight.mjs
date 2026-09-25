import { execFileSync } from "node:child_process";

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function errorText(error) {
  return [error?.stderr, error?.stdout, error?.message].filter(Boolean).join(" ");
}

// Non-blocking probe: tells the participant early whether Steps 2 and 4 can
// read the CodeQL report or will need an explicit unverified override.
export function probeCodeqlAccess(execute = run) {
  let repository;
  try {
    const origin = execute("git", ["remote", "get-url", "origin"]);
    repository = JSON.parse(execute("gh", ["repo", "view", origin, "--json", "nameWithOwner"])).nameWithOwner;
  } catch (error) {
    return { ok: false, message: `WARN: CodeQL pre-flight could not identify the repository (${errorText(error).split("\n")[0].trim()}).` };
  }
  try {
    execute("gh", ["api", "--method", "GET", `repos/${repository}/code-scanning/analyses`, "-f", "per_page=1"]);
    return { ok: true, message: `PASS: CodeQL reports are readable for ${repository}.` };
  } catch (error) {
    const text = errorText(error);
    if (/no analysis found/i.test(text)) {
      return { ok: true, message: `PASS: Code scanning is reachable for ${repository}; no analysis exists yet.` };
    }
    const denied = /\b403\b|forbidden|not accessible|must be enabled|advanced security/i.test(text);
    return {
      ok: false,
      message: denied
        ? `WARN: CodeQL reports are not readable for ${repository} (403). Tell the facilitator; otherwise expect to accept an unverified CodeQL override in Steps 2 and 4.`
        : `WARN: CodeQL pre-flight failed for ${repository}. Tell the facilitator; otherwise expect to accept an unverified CodeQL override in Steps 2 and 4.`,
    };
  }
}
