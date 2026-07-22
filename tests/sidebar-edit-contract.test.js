const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/sidebar.js", "utf8");

assert.ok(!source.includes("defaultView.prompt("), "editing must not depend on the native prompt dialog");
assert.ok(source.includes('editor.className = "research-agent-edit-box"'), "editing must use an inline textarea");
assert.ok(source.includes('"保存修改"'), "editing must expose a save action");
assert.ok(source.includes('"保存并重新发送"'), "user messages must expose an explicit resend action");
assert.ok(source.includes("existingMessage = false"), "resend must reuse the edited user message rather than append a duplicate");
assert.ok(source.includes("Zotero.Items.get(state.active.paper.itemID)"), "resend must fall back to the conversation's associated paper");
assert.ok(source.includes("await paper.getBestAttachment()"), "conversation switching must resolve the paper's readable attachment");
assert.ok(source.includes("await Zotero.Reader.open(attachment.id)"), "conversation switching must open the associated paper in Zotero Reader");

console.log("Sidebar edit contract passed.");
