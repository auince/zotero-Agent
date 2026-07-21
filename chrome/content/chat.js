/* global Zotero */

let api;
let activeJob;

window.addEventListener("DOMContentLoaded", () => {
  api = window.opener.ResearchAgentPlugin;
  const $ = (id) => document.getElementById(id);
  $("index-current").addEventListener("click", () => startIndexing(() => api.startIndexCurrentCollection(updateProgress)));
  $("index-selected").addEventListener("click", () => startIndexing(() => api.startIndexSelectedArticles(updateProgress)));
  $("index-all").addEventListener("click", () => startIndexing(() => api.startIndexAllArticles(updateProgress)));
  $("cancel-index").addEventListener("click", () => api.cancelIndexing());
  $("refresh-entries").addEventListener("click", refreshEntries);
  $("remove-entries").addEventListener("click", async () => {
    const keys = selectedEntryKeys();
    if (!keys.length || !window.confirm(`Remove ${keys.length} local knowledge-base entries? Zotero items will not be deleted.`)) return;
    await run("Removing local knowledge-base entries…", async () => { addMessage("System", await api.removeKnowledgeEntries(keys)); await refreshEntries(); });
  });
  $("reembed-entries").addEventListener("click", () => {
    const keys = selectedEntryKeys();
    if (keys.length) startIndexing(() => api.reembedKnowledgeEntries(keys, updateProgress));
  });
  $("daily-note").addEventListener("click", async () => run("Creating a concise daily note…", () => api.updateDailyNote()));
  $("open-vault").addEventListener("click", () => api.openVault());
  $("question-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = $("question").value.trim();
    if (!question) return;
    addMessage("You", question);
    $("question").value = "";
    await run("Researching…", async () => addMessage("Agent", await api.ask(question)));
  });
  refreshEntries();
});

async function startIndexing(createJob) {
  if (activeJob) return;
  try {
    activeJob = await createJob();
    document.getElementById("cancel-index").disabled = false;
    updateProgress({ ...activeJob, state: "running" });
    const result = await activeJob.promise;
    const detail = result.errors.length ? ` ${result.errors.length} article(s) failed; see Error Console.` : "";
    addMessage("System", `${result.state}: ${result.completed}/${result.total} articles processed.${detail}`);
    await refreshEntries();
  } catch (error) {
    Zotero.logError(error);
    document.getElementById("status").textContent = `Error: ${error.message}`;
  } finally {
    activeJob = null;
    document.getElementById("cancel-index").disabled = true;
  }
}

function updateProgress(progress) {
  const bar = document.getElementById("index-progress");
  bar.max = Math.max(progress.total, 1);
  bar.value = progress.completed;
  document.getElementById("index-progress-label").textContent = `${progress.label}: ${progress.completed}/${progress.total} articles${progress.cancelled ? " (cancelling)" : ""}`;
}

async function refreshEntries() {
  const entries = await api.listKnowledgeEntries();
  const select = document.getElementById("knowledge-entries");
  select.replaceChildren();
  for (const entry of entries) {
    const option = document.createElement("option");
    option.value = entry.key;
    option.textContent = `${entry.title} [${entry.key}] — ${entry.collectionPath.join(" / ")}`;
    select.append(option);
  }
}

function selectedEntryKeys() {
  return [...document.getElementById("knowledge-entries").selectedOptions].map((option) => option.value);
}

async function run(status, callback) {
  document.getElementById("status").textContent = status;
  try {
    await callback();
    document.getElementById("status").textContent = "Ready";
  } catch (error) {
    Zotero.logError(error);
    document.getElementById("status").textContent = `Error: ${error.message}`;
  }
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = "message";
  const label = document.createElement("span");
  label.className = "role";
  label.textContent = `${role}: `;
  message.append(label, document.createTextNode(text));
  const conversation = document.getElementById("conversation");
  conversation.append(message);
  conversation.scrollTop = conversation.scrollHeight;
}
