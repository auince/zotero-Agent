const assert = require("node:assert/strict");
const fs = require("node:fs");

const storage = fs.readFileSync("src/storage.js", "utf8");
const dailyNotes = fs.readFileSync("src/daily-notes.js", "utf8");
const sidebar = fs.readFileSync("src/sidebar.js", "utf8");

assert.ok(storage.includes("notes-index.json"), "notes need a persistent metadata index");
assert.ok(storage.includes("listNotes()"), "notes page needs to list local notes");
assert.ok(storage.includes("getNoteForDay(day)"), "daily generation must identify an existing note for the day");
assert.ok(storage.includes("openNotesDirectory()"), "notes page must open the local notes directory");
assert.ok(dailyNotes.includes("existing?.filename"), "re-running daily generation must update the same note");
assert.ok(sidebar.includes('"笔记"'), "the sidebar must expose a notes tab");
assert.ok(sidebar.includes("每日研究笔记"), "notes page must have a dedicated manager");
assert.ok(sidebar.includes("复制当前笔记"), "notes page must support copying the selected note");

console.log("Notes management contract passed.");
