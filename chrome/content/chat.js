/* global Zotero */

let api;

window.addEventListener("DOMContentLoaded", () => {
  api = window.opener.ResearchAgentPlugin;
  const $ = (id) => document.getElementById(id);
  $("index-current").addEventListener("click", async () => run("Indexing selected collection…", () => api.indexCurrentCollection()));
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
});

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
