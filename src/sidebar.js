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
    const title = item?.getField("title") || "未选择文献";
    setSectionSummary(item ? `当前上下文：${title}` : "聊天与知识库");
    const selected = body.querySelector(".research-agent-selected-item");
    if (selected) {
      selected.textContent = item ? title : "选择一篇文献后，助手会将它作为当前上下文。";
      return;
    }
    this.mount(body, doc, item);
  },

  mount(body, doc, item) {
    const style = doc.createElement("style");
    style.textContent = `
      .research-agent { --ra-accent:#3478c5; --ra-accent-weak:#e9f2ff; --ra-border:color-mix(in srgb, currentColor 15%, transparent); display:flex; flex-direction:column; gap:10px; height:min(76vh, 940px); min-height:520px; font:menu; color:var(--fill-primary, #1d2733); }
      @media (prefers-color-scheme:dark) { .research-agent { --ra-accent:#7cb7ff; --ra-accent-weak:#1b3552; } }
      .research-agent-top { display:flex; align-items:center; gap:8px; padding:3px; border:1px solid var(--ra-border); border-radius:10px; background:color-mix(in srgb, var(--ra-accent) 5%, transparent); }
      .research-agent-tab { flex:1; min-height:30px; border:0; border-radius:7px; background:transparent; color:inherit; font:menu; font-weight:600; cursor:pointer; }
      .research-agent-tab:hover { background:color-mix(in srgb, var(--ra-accent) 10%, transparent); }
      .research-agent-tab.is-active { background:var(--ra-accent); color:white; box-shadow:0 1px 4px color-mix(in srgb, var(--ra-accent) 35%, transparent); }
      .research-agent-status { padding:7px 9px; border-radius:8px; background:var(--ra-accent-weak); color:color-mix(in srgb, var(--ra-accent) 78%, currentColor); font-size:.91em; line-height:1.35; }
      .research-agent-panel { display:none; min-height:0; }
      .research-agent-panel.is-active { display:flex; flex:1; flex-direction:column; gap:10px; }
      .research-agent-context { padding:9px 10px; border:1px solid var(--ra-border); border-radius:10px; background:color-mix(in srgb, var(--ra-accent) 4%, transparent); }
      .research-agent-context-label { display:block; margin-bottom:3px; color:var(--fill-secondary, #687583); font-size:.82em; font-weight:600; }
      .research-agent-selected-item { display:-webkit-box; overflow:hidden; -webkit-box-orient:vertical; -webkit-line-clamp:2; font-weight:650; line-height:1.35; }
      .research-agent-log { flex:1; min-height:235px; overflow:auto; padding:12px; border:1px solid var(--ra-border); border-radius:11px; background:var(--material-sidepane, #fff); box-shadow:inset 0 1px 0 color-mix(in srgb, currentColor 4%, transparent); white-space:pre-wrap; line-height:1.48; }
      .research-agent-message { margin:0 0 12px; padding:8px 10px; border-radius:9px; background:color-mix(in srgb, currentColor 4%, transparent); }
      .research-agent-message:last-child { margin-bottom:0; }
      .research-agent-message.is-user { background:var(--ra-accent-weak); }
      .research-agent-role { display:block; margin-bottom:3px; color:var(--ra-accent); font-size:.84em; font-weight:700; }
      .research-agent-composer { display:flex; flex-direction:column; gap:7px; }
      .research-agent textarea { box-sizing:border-box; width:100%; min-height:108px; max-height:34vh; padding:10px; resize:vertical; border:1px solid var(--ra-border); border-radius:10px; background:var(--material-sidepane, #fff); color:inherit; font:menu; line-height:1.42; }
      .research-agent textarea:focus { outline:2px solid color-mix(in srgb, var(--ra-accent) 48%, transparent); outline-offset:1px; }
      .research-agent-sendline { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .research-agent-hint { color:var(--fill-secondary, #687583); font-size:.82em; }
      .research-agent button { min-height:29px; padding:5px 9px; border:1px solid var(--ra-border); border-radius:7px; background:var(--material-sidepane, #fff); color:inherit; font:menu; cursor:pointer; }
      .research-agent button:hover:not(:disabled) { border-color:var(--ra-accent); background:var(--ra-accent-weak); }
      .research-agent button:disabled { cursor:wait; opacity:.65; }
      .research-agent-primary { border-color:var(--ra-accent) !important; background:var(--ra-accent) !important; color:white !important; font-weight:650 !important; }
      .research-agent-actions { display:flex; flex-wrap:wrap; gap:6px; }
      .research-agent-card { display:flex; flex-direction:column; gap:9px; padding:11px; border:1px solid var(--ra-border); border-radius:11px; background:color-mix(in srgb, currentColor 2%, transparent); }
      .research-agent-card-title { font-weight:700; } .research-agent-card-copy { margin:0; color:var(--fill-secondary, #687583); font-size:.9em; line-height:1.38; }
      .research-agent-progress { width:100%; height:6px; accent-color:var(--ra-accent); }
      .research-agent-entry-list { flex:1; min-height:145px; width:100%; box-sizing:border-box; border:1px solid var(--ra-border); border-radius:8px; background:var(--material-sidepane, #fff); color:inherit; font:menu; }
      .research-agent-entry-list option { padding:5px; }
    `;
    body.append(style);

    const root = doc.createElement("div");
    root.className = "research-agent";
    const status = doc.createElement("div");
    status.className = "research-agent-status";
    status.textContent = "就绪。请在 Zotero 设置 → Research Agent 中配置 DeepSeek 与 SiliconFlow。";
    const tabs = doc.createElement("div");
    tabs.className = "research-agent-top";
    const chatPanel = doc.createElement("section");
    chatPanel.className = "research-agent-panel is-active";
    const knowledgePanel = doc.createElement("section");
    knowledgePanel.className = "research-agent-panel";
    const chatTab = this.button(doc, "✦ 聊天", () => activate("chat"));
    const knowledgeTab = this.button(doc, "▦ 知识库", () => activate("knowledge"));
    chatTab.classList.add("research-agent-tab", "is-active");
    knowledgeTab.classList.add("research-agent-tab");
    tabs.append(chatTab, knowledgeTab);
    const activate = (page) => {
      const showChat = page === "chat";
      chatPanel.classList.toggle("is-active", showChat);
      knowledgePanel.classList.toggle("is-active", !showChat);
      chatTab.classList.toggle("is-active", showChat);
      knowledgeTab.classList.toggle("is-active", !showChat);
      if (!showChat) refreshEntries().catch((error) => { Zotero.logError(error); status.textContent = `错误：${error.message}`; });
    };

    const context = doc.createElement("div");
    context.className = "research-agent-context";
    const contextLabel = doc.createElement("span");
    contextLabel.className = "research-agent-context-label";
    contextLabel.textContent = "当前文献上下文";
    const selected = doc.createElement("div");
    selected.className = "research-agent-selected-item";
    selected.textContent = item?.getField("title") || "选择一篇文献后，助手会将它作为当前上下文。";
    context.append(contextLabel, selected);
    const log = doc.createElement("div");
    log.className = "research-agent-log";
    this.addMessage(doc, log, "助手", "可以询问当前论文、知识库内容、网页、arXiv 或 GitHub 源码。", false);
    const composer = doc.createElement("div");
    composer.className = "research-agent-composer";
    const input = doc.createElement("textarea");
    input.placeholder = "输入你的问题…";
    input.setAttribute("aria-label", "向研究助手提问");
    const resizeInput = () => {
      input.style.height = "auto";
      const max = Math.max(150, doc.defaultView.innerHeight * 0.34);
      input.style.height = `${Math.min(Math.max(input.scrollHeight, 108), max)}px`;
    };
    const ask = async () => {
      const question = input.value.trim();
      if (!question || send.disabled) return;
      this.addMessage(doc, log, "你", question, true);
      input.value = "";
      resizeInput();
      send.disabled = true;
      status.textContent = "正在检索并组织回答…";
      try {
        this.addMessage(doc, log, "助手", await ResearchAgentAgent.answer(question), false);
        status.textContent = "就绪";
      } catch (error) {
        Zotero.logError(error);
        status.textContent = `错误：${error.message}`;
      } finally {
        send.disabled = false;
        input.focus();
      }
    };
    const send = this.button(doc, "发送", ask);
    send.classList.add("research-agent-primary");
    const sendLine = doc.createElement("div");
    sendLine.className = "research-agent-sendline";
    const hint = doc.createElement("span");
    hint.className = "research-agent-hint";
    hint.textContent = "⌘ / Ctrl + Enter 发送";
    sendLine.append(hint, send);
    input.addEventListener("input", resizeInput);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); ask(); }
    });
    composer.append(input, sendLine);
    chatPanel.append(context, log, composer);

    const indexCard = doc.createElement("div");
    indexCard.className = "research-agent-card";
    const indexTitle = doc.createElement("div");
    indexTitle.className = "research-agent-card-title";
    indexTitle.textContent = "嵌入文献";
    const indexCopy = doc.createElement("p");
    indexCopy.className = "research-agent-card-copy";
    indexCopy.textContent = "嵌入任务在后台顺序执行，不会阻塞 Zotero 的其他操作。";
    const actions = doc.createElement("div");
    actions.className = "research-agent-actions";
    const progress = doc.createElement("progress");
    progress.className = "research-agent-progress";
    progress.max = 1;
    progress.value = 0;
    const updateProgress = (event) => {
      progress.max = Math.max(1, event.total);
      progress.value = event.completed;
      status.textContent = `${event.label}：${event.completed}/${event.total} 篇文献${event.cancelled ? "（正在取消）" : ""}`;
    };
    const startJob = async (start) => {
      try {
        const job = await start(updateProgress);
        updateProgress(job);
        const result = await job.promise;
        status.textContent = `${result.state}：已处理 ${result.completed}/${result.total} 篇文献。`;
        await refreshEntries();
      } catch (error) {
        Zotero.logError(error);
        status.textContent = `错误：${error.message}`;
      }
    };
    actions.append(
      this.button(doc, "嵌入当前分类", () => startJob((callback) => ResearchAgentIndexer.startCurrentCollection(callback))),
      this.button(doc, "嵌入所选文献", () => startJob((callback) => ResearchAgentIndexer.startSelectedArticles(callback))),
      this.button(doc, "嵌入全部文献", () => startJob((callback) => ResearchAgentIndexer.startAllArticles(callback))),
      this.button(doc, "取消任务", () => ResearchAgentJobs.cancel())
    );
    indexCard.append(indexTitle, indexCopy, actions, progress);

    const management = doc.createElement("div");
    management.className = "research-agent-card";
    const managementTitle = doc.createElement("div");
    managementTitle.className = "research-agent-card-title";
    managementTitle.textContent = "知识库条目";
    const entryCopy = doc.createElement("p");
    entryCopy.className = "research-agent-card-copy";
    entryCopy.textContent = "选择条目后可重嵌入或从本地知识库移除；不会删除 Zotero 中的原始文献。";
    const entries = doc.createElement("select");
    entries.className = "research-agent-entry-list";
    entries.multiple = true;
    entries.size = 7;
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
      if (!records.length) {
        const option = doc.createElement("option");
        option.disabled = true;
        option.textContent = "尚未嵌入任何文献";
        entries.append(option);
      }
    };
    const entryActions = doc.createElement("div");
    entryActions.className = "research-agent-actions";
    entryActions.append(
      this.button(doc, "刷新", refreshEntries),
      this.button(doc, "重嵌入所选", () => startJob((callback) => ResearchAgentIndexer.startReembedEntries(selectedKeys(), callback))),
      this.button(doc, "移除所选", async () => {
        const keys = selectedKeys();
        if (!keys.length || !doc.defaultView.confirm(`从本地知识库移除 ${keys.length} 个条目？Zotero 原始文献不会被删除。`)) return;
        status.textContent = await ResearchAgentIndexer.removeEntries(keys);
        await refreshEntries();
      }),
      this.button(doc, "生成今日笔记", async () => { status.textContent = await ResearchAgentDailyNotes.runNow(); })
    );
    management.append(managementTitle, entryCopy, entries, entryActions);
    knowledgePanel.append(indexCard, management);

    root.append(tabs, status, chatPanel, knowledgePanel);
    body.append(root);
    resizeInput();
  },

  button(doc, label, onClick) {
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  },

  addMessage(doc, log, role, text, isUser) {
    const message = doc.createElement("div");
    message.className = `research-agent-message${isUser ? " is-user" : ""}`;
    const label = doc.createElement("span");
    label.className = "research-agent-role";
    label.textContent = role;
    message.append(label, doc.createTextNode(text));
    log.append(message);
    log.scrollTop = log.scrollHeight;
  }
};
