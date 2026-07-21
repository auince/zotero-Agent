const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/sidebar.js", "utf8");

for (const label of ["概述全文", "创新贡献", "方法实验", "结果解读", "局限改进", "关联我的研究"]) {
  assert.ok(source.includes(`"${label}"`), `missing paper-reading preset: ${label}`);
}
for (const label of ["解释选段", "翻译选段", "总结要点", "批判性阅读"]) {
  assert.ok(source.includes(`"${label}"`), `missing selected-text preset: ${label}`);
}
assert.ok(source.includes("fillQuickPrompt(prompt)"), "presets must prefill the composer without sending automatically");
assert.ok(source.includes("preset ||"), "selected-text presets must retain the chosen instruction");

console.log("Quick reading prompts contract passed.");
