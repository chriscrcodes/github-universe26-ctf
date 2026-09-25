const { setTimeout: delay } = require("node:timers/promises");
const { collectCodeqlEvidence, githubApi, REF } = require("../src/codeql-evidence");

async function verify(context, { api = githubApi, wait = delay, attempts = 12 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const alerts = await api(context.repository, "alerts", { ref: context.ref, tool_name: "CodeQL", per_page: "100" });
      const initial = alerts.find((alert) => alert.tool?.name === "CodeQL"
        && alert.rule?.id === "js/sql-injection" && alert.state === "fixed");
      if (!initial) throw new Error("No fixed baseline SQL injection alert yet.");
      return await collectCodeqlEvidence(context, "blue", { ...context, alertNumber: initial.number }, api);
    } catch (error) {
      if (attempt === attempts) throw error;
      console.log(`CodeQL evidence not ready (${attempt}/${attempts}); waiting for ingestion.`);
      await wait(10000);
    }
  }
}

if (require.main === module) {
  verify({ repository: process.env.GITHUB_REPOSITORY, ref: process.env.GITHUB_REF, commit: process.env.GITHUB_SHA })
    .then((evidence) => console.log(`CodeQL clean: ${evidence.repository} ${REF} ${evidence.commit}, analysis ${evidence.analysisId}.`))
    .catch((error) => {
      console.error(`CodeQL verification failed: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = { verify };