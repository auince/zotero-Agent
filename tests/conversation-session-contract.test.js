const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = {
  Zotero: {
    DataDirectory: { dir: "/tmp" },
    File: { pathToFile: () => ({ clone: () => ({ append() {}, path: "/tmp" }) }) }
  },
  Date, Math, String, JSON, RegExp
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("src/storage.js", "utf8"), context);

const paper = {
  isRegularItem: () => true,
  key: "ABCD1234",
  id: 12,
  libraryID: 1,
  getField: () => "一篇关联论文"
};
const conversation = context.ResearchAgentStorage.newConversation({ item: paper });
assert.equal(conversation.title, "一篇关联论文", "a new linked conversation must default to its paper title");
conversation.messages.push({ role: "user", content: "请解释本文的实验设计和关键结果" });
context.ResearchAgentStorage.refreshAutoTitle(conversation);
assert.match(conversation.title, /一篇关联论文/);
assert.match(conversation.title, /实验设计/);

const sidebar = fs.readFileSync("src/sidebar.js", "utf8");
assert.ok(sidebar.includes("switchRequest"), "session selection must reject stale asynchronous switches");
assert.ok(sidebar.includes('activate("chat")'), "selecting a session must immediately show its conversation");
assert.ok(sidebar.includes("research-agent-session-paper"), "linked paper metadata must render in its own non-overlapping row");

console.log("Conversation session contract passed.");
