const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class Node {
  constructor(name) { this.name = name; this.children = []; this.parentNode = null; this.dataset = {}; this._text = ""; }
  append(...nodes) { for (const node of nodes) { node.parentNode = this; this.children.push(node); } }
  replaceChildren(...nodes) { for (const node of this.children) node.parentNode = null; this.children = []; this._text = ""; this.append(...nodes); }
  remove() { if (!this.parentNode) return; const index = this.parentNode.children.indexOf(this); if (index >= 0) this.parentNode.children.splice(index, 1); this.parentNode = null; }
  set textContent(value) { this.children = []; this._text = String(value); }
  get textContent() { return this._text; }
}
const doc = { createElement: (name) => new Node(name), createTextNode: (text) => { const node = new Node("#text"); node.textContent = text; return node; } };
const context = { URL, String, Error, Set };
vm.createContext(context);
vm.runInContext(fs.readFileSync("src/markdown.js", "utf8"), context);

const markdown = context.ResearchAgentMarkdown;
const split = markdown.takeCompleteBlocks("第一段\n\n第二段");
assert.equal(split.complete, "第一段\n\n");
assert.equal(split.remaining, "第二段");
const code = markdown.takeCompleteBlocks("```js\nconst x = 1;\n\nconst y = 2;\n```\n\n尾部");
assert.equal(code.complete, "```js\nconst x = 1;\n\nconst y = 2;\n```\n\n");
assert.equal(code.remaining, "尾部");
const math = markdown.takeCompleteBlocks("\\[\na^2 + b^2 = c^2\n\\]\n继续生成");
assert.equal(math.complete, "\\[\na^2 + b^2 = c^2\n\\]\n");
assert.equal(math.remaining, "继续生成");

const target = new Node("target");
const stream = markdown.createStreamRenderer(doc, target);
stream.append("第一段");
assert.equal(target.children.length, 1, "unfinished text should use one pending node");
stream.append("\n\n");
const firstParagraph = target.children[0];
assert.equal(firstParagraph.name, "p");
stream.append("第二段");
assert.equal(target.children[0], firstParagraph, "completed paragraphs must not be re-rendered");
stream.finish();
assert.equal(target.children[0], firstParagraph, "finishing must preserve earlier rendered nodes");
assert.equal(target.children.length, 2);

console.log("Markdown streaming contract passed.");
