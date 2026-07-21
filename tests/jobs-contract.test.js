const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { Zotero: { logError: () => {} }, setTimeout };
vm.createContext(context);
vm.runInContext(fs.readFileSync("src/jobs.js", "utf8"), context);

(async () => {
  const progress = [];
  const job = context.ResearchAgentJobs.start("test", [{ item: { key: "A" } }, { item: { key: "B" } }], async () => {}, (event) => progress.push(event.completed));
  const result = await job.promise;
  assert.equal(result.state, "completed");
  assert.equal(result.completed, 2);
  assert.equal(context.ResearchAgentJobs.active, null);
  assert.deepEqual(progress, [0, 1, 2]);
  console.log("Background job contract passed.");
})();
