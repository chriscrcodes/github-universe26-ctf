import { BOARD_URL, request } from "../test/http.mjs";

const teams = Math.min(60, Math.max(1, Number(process.env.TEAMS || 60)));
const sessionId = process.env.SESSION_ID || `load-test-${Date.now()}`;
const phases = ["started", "red", "purple", "green", "blue"];
const boardToken = process.env.BOARD_TOKEN || "";
const headers = {
  "content-type": "application/json",
  ...(boardToken ? { "x-board-reporter-token": boardToken } : {}),
};
const started = performance.now();
let sent = 0;
let failed = 0;
for (const phase of phases) {
  const results = await Promise.all(Array.from({ length: teams }, (_, index) =>
    request(BOARD_URL, "/api/events", {
      method: "POST",
      headers: { ...headers, "x-forwarded-for": `198.51.100.${index + 1}` },
      body: JSON.stringify({
        sessionId, teamId: `load-${index}`, alias: `Purple ${index + 1}`,
        phase, source: "participant",
      }),
    })
  ));
  sent += results.length;
  failed += results.filter(({ response }) => !response.ok).length;
}
const elapsed = Math.round(performance.now() - started);
console.log(JSON.stringify({ board: BOARD_URL, teams, sent, failed, elapsedMs: elapsed }));
if (failed) process.exitCode = 1;
