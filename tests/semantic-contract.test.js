const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const vector = (values) => Buffer.from(new Float32Array(values).buffer).toString("base64");
const context = { Uint8Array, Float32Array, atob, Zotero: { Prefs: { get: () => "" } } };
vm.createContext(context);
vm.runInContext(fs.readFileSync("src/semantic.js", "utf8"), context);
assert.equal(context.ResearchAgentSemantic.cosine(vector([1, 0]), vector([1, 0])), 1);
assert.equal(context.ResearchAgentSemantic.cosine(vector([1, 0]), vector([0, 1])), 0);
console.log("Semantic vector contract passed.");
