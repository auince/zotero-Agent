const assert = require("node:assert/strict");
const fs = require("node:fs");

const markdown = fs.readFileSync("src/markdown.js", "utf8");
const main = fs.readFileSync("src/main.js", "utf8");
const sidebar = fs.readFileSync("src/sidebar.js", "utf8");

assert.ok(main.includes("vendor/katex/katex.min.js"), "KaTeX must load locally before the sidebar");
assert.ok(markdown.includes("appendMathBlock"), "Markdown must recognize display math blocks");
assert.ok(markdown.includes("katex.renderToString"), "TeX must be rendered through KaTeX");
assert.ok(markdown.includes('value.startsWith("\\\\(")'), "Markdown must recognize inline \\( ... \\) math");
assert.ok(markdown.includes('value.startsWith("$")'), "Markdown must recognize inline $ ... $ math");
assert.ok(markdown.includes("mathClosing"), "streaming must wait for a display formula to close");
assert.ok(sidebar.includes("vendor/katex/katex.min.css"), "KaTeX CSS must be injected into the sidebar document");

console.log("Math rendering contract passed.");
