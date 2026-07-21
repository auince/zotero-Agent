const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/sidebar.js", "utf8");

assert.ok(source.includes('registerEventListener("renderTextSelectionPopup"'), "must use Zotero's reader selection API");
assert.ok(source.includes('"添加到研究助手"'), "reader selection popup must provide an add action");
assert.ok(source.includes("queueSelectedText({ text, title, preset })"), "reader action must forward the selected text and preset to the sidebar");
assert.ok(source.includes("this.selectionListeners.add(receiveSelectedText)"), "mounted chat must receive reader selections");
assert.ok(source.includes('"复制"'), "every conversation message must expose a copy action");
assert.ok(source.includes("user-select:text!important"), "message body text must remain selectable");

console.log("Reader selection and copy contract passed.");
