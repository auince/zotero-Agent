/* global Zotero, ResearchAgentAgent, ResearchAgentIndexer, ResearchAgentJobs, ResearchAgentDailyNotes */

var ResearchAgentSidebar = {
  sectionID: null,
  rootURI: null,

  register(rootURI) {
    this.rootURI = rootURI;
    this.sectionID = Zotero.ItemPaneManager.registerSection({
      paneID: "research-agent-chat",
      pluginID: "research-agent@zotero.example.com",
      header: { l10nID: "research-agent-header", icon: `${rootURI}icons/research-agent.svg` },
      sidenav: { l10nID: "research-agent-header", icon: `${rootURI}icons/research-agent.svg`, orderable: true },
      onRender: (props) => this.render(props)
    });
  },

  unregister() {
    if (this.sectionID) Zotero.ItemPaneManager.unregisterSection(this.sectionID);
    this.sectionID = null;
  },

  render({ body, doc, item, setSectionSummary }) {
    setSectionSummary(item ? `Chat about: ${item.getField("title") || "selected item"}` : "Chat and knowledge base");
    const selected = body.querySelector(".research-agent-selected-item");
    if (selected) {
      selected.textContent = item ? `Selected item: ${item.getField("title") || "Untitled"}` : "Select an item to use it as context.";
      return;
    }
    this.mount(body, doc, item);
  },

  mount(body, doc, item) {
    const style = doc.createElement("style");
    style.textContent = `
      .research-agent { display:flex; flex-direction:column; gap:7px; min-height:300px; font:menu; }
      .research-agent-actions { display:flex; flex-wrap:wrap; gap:5px; }
      .research-agent-log { min-height:150px; max-height:310px; overflow:auto; padding:7px; border:1px solid var(--fill-secondary, #d7dce0); background:var(--material-sidepane, #fff); white-space:pre-wrap; line-height:1.4; }
      .research-agent-message { margin:0 0 8px; } .research-agent-role { font-weight:600; color:#35678b; }
      .research-agent textarea { box-sizing:border-box; width:100%; resize:vertical; min-height:70px; }
      .research-agent-progress { width:100%; } .research-agent-status { color:#59636e; font-size:.9em; }
      .research-agent-management { border-top:1px solid var(--fill-secondary, #d7dce0); padding-top:7px; }
      .research-agent-management select { width:100%; min-height:105px; font:menu; }
    `;
    body.append(style);
    const root = doc.createElement("div");
    root.className = "research-agent";
    const selected = doc.createElement("div");
    selected.className = "research-agent-selected-item";
    selected.textContent = item ? `Selected item: ${item.getField("title") || "Untitled"}` : "Select an item to use it as context.";
    const status = doc.createElement("div");
    status.className = "research-agent-status";
    status.textContent = "Ready. Configure DeepSeek and SiliconFlow in Zotero Settings → Research Agent.";
    const log = doc.createElement("div");
    log.className = "research-agent-log";
    const input = doc.createElement("textarea");
    input.placeholder = "Ask about your library, the selected paper, the web, arXiv, or GitHub…";
    const send = this.button(doc, "Send", async () => {
      const question = input.value.trim();
      if (!question) return;
      this.addMessage(doc, log, "You", question);
      input.value = "";
      status.textContent = "Researching…";
      try {
        this.addMessage(doc, log, "Agent", await ResearchAgentAgent.answer(question));
        status.textContent = "Ready";
      } catch (error) {
        Zotero.logError(error);
        status.textContent = `Error: ${error.message}`;
      }
    });
    const actions = doc.createElement("div");
    actions.className = "research-agent-actions";
    const progress = doc.createElement("progress");
    progress.className = "research-agent-progress";
    progress.max = 1;
    progress.value = 0;
    const updateProgress = (event) => {
      progress.max = Math.max(1, event.total);
      progress.value = event.completed;
      status.textContent = `${event.label}: ${event.completed}/${event.total} articles${event.cancelled ? " (cancelling)" : ""}`;
    };
    const startJob = async (start) => {
      try {
        const job = await start(updateProgress);
        updateProgress(job);
        const result = await job.promise;
        status.textContent = `${result.state}: ${result.completed}/${result.total} articles processed.`;
        await refreshEntries();
      } catch (error) {
        Zotero.logError(error);
        status.textContent = `Error: ${error.message}`;
      }
    };
    actions.append(
      this.button(doc, "Embed collection", () => startJob((progressCallback) => ResearchAgentIndexer.startCurrentCollection(progressCallback))),
      this.button(doc, "Embed selection", () => startJob((progressCallback) => ResearchAgentIndexer.startSelectedArticles(progressCallback))),
      this.button(doc, "Embed all", () => startJob((progressCallback) => ResearchAgentIndexer.startAllArticles(progressCallback))),
      this.button(doc, "Cancel", () => ResearchAgentJobs.cancel())
    );
    const management = doc.createElement("details");
    management.className = "research-agent-management";
    const summary = doc.createElement("summary");
    summary.textContent = "Manage knowledge-base entries";
    const entries = doc.createElement("select");
    entries.multiple = true;
    entries.size = 6;
    const entryActions = doc.createElement("div");
    entryActions.className = "research-agent-actions";
    const selectedKeys = () => [...entries.selectedOptions].map((option) => option.value);
    const refreshEntries = async () => {
      const records = await ResearchAgentIndexer.listEntries();
      entries.replaceChildren();
      for (const record of records) {
        const option = doc.createElement("option");
        option.value = record.key;
        option.textContent = `${record.title} [${record.key}] — ${record.collectionPath.join(" / ")}`;
        entries.append(option);
      }
    };
    entryActions.append(
      this.button(doc, "Refresh", refreshEntries),
      this.button(doc, "Re-embed", () => startJob((progressCallback) => ResearchAgentIndexer.startReembedEntries(selectedKeys(), progressCallback))),
      this.button(doc, "Remove", async () => {
        const keys = selectedKeys();
        if (!keys.length || !doc.defaultView.confirm(`Remove ${keys.length} local knowledge-base entries? Zotero items stay untouched.`)) return;
        status.textContent = await ResearchAgentIndexer.removeEntries(keys);
        await refreshEntries();
      }),
      this.button(doc, "Daily note", async () => { status.textContent = await ResearchAgentDailyNotes.runNow(); })
    );
    management.append(summary, entryActions, entries);
    root.append(selected, status, actions, progress, log, input, send, management);
    body.append(root);
    refreshEntries().catch((error) => { Zotero.logError(error); status.textContent = `Error: ${error.message}`; });
  },

  button(doc, label, onClick) {
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  },

  addMessage(doc, log, role, text) {
    const message = doc.createElement("div");
    message.className = "research-agent-message";
    const label = doc.createElement("span");
    label.className = "research-agent-role";
    label.textContent = `${role}: `;
    message.append(label, doc.createTextNode(text));
    log.append(message);
    log.scrollTop = log.scrollHeight;
  }
};
