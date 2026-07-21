const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = {
  Zotero: { Prefs: { get: () => 100 }, logError: () => {} },
  ResearchAgentTools: { request: async () => "{}" },
  Set, Math, String, Date, RegExp
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("src/memory.js", "utf8"), context);

(async () => {
  const conversation = {
    messages: [
      { id: "a", role: "user", content: "早期研究问题：如何构建分层检索系统？", createdAt: "2026-01-01" },
      { id: "b", role: "assistant", content: "建议使用文章与段落两级索引，并保留摘要记忆。", createdAt: "2026-01-01" },
      { id: "c", role: "user", content: "请继续讨论上下文压缩和记忆检索。", createdAt: "2026-01-02" }
    ],
    memory: { rootSummary: "", layers: [], compressedMessageIDs: [] }
  };
  await context.ResearchAgentMemory.compress(conversation, "", () => {});
  assert.ok(conversation.memory.layers.length > 0);
  assert.ok(conversation.memory.compressedMessageIDs.length > 0);
  const recalled = context.ResearchAgentMemory.retrieve(conversation.memory.layers, "分层检索", 3);
  assert.ok(recalled.length > 0);
  console.log("Conversation memory contract passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
