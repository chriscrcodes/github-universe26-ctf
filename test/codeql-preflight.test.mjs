import test from "node:test";
import assert from "node:assert/strict";
import { probeCodeqlAccess } from "../scripts/codeql-preflight.mjs";

function fakeExecute(apiError) {
  return (command, args) => {
    if (command === "git") return "https://github.com/octo/github-universe26-ctf.git";
    if (args[0] === "repo") return JSON.stringify({ nameWithOwner: "octo/github-universe26-ctf" });
    if (apiError) throw Object.assign(new Error("Command failed"), { stderr: apiError });
    return "[]";
  };
}

test("CodeQL pre-flight passes when analyses are readable", () => {
  const result = probeCodeqlAccess(fakeExecute());
  assert.equal(result.ok, true);
  assert.match(result.message, /^PASS: CodeQL reports are readable for octo\/github-universe26-ctf/);
});

test("CodeQL pre-flight passes when code scanning has no analysis yet", () => {
  const result = probeCodeqlAccess(fakeExecute("gh: no analysis found (HTTP 404)"));
  assert.equal(result.ok, true);
  assert.match(result.message, /no analysis exists yet/);
});

test("CodeQL pre-flight warns early about a 403 and the override path", () => {
  const result = probeCodeqlAccess(fakeExecute("gh: Resource not accessible by integration (HTTP 403)"));
  assert.equal(result.ok, false);
  assert.match(result.message, /^WARN: CodeQL reports are not readable[\s\S]*\(403\)[\s\S]*unverified CodeQL override in Steps 2 and 4/);
});

test("CodeQL pre-flight warns without throwing when the repository is unknown", () => {
  const result = probeCodeqlAccess(() => {
    throw Object.assign(new Error("Command failed"), { stderr: "fatal: No such remote 'origin'" });
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /could not identify the repository/);
});
