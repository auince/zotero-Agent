/* global Zotero, ResearchAgentAgent, ResearchAgentIndexer, ResearchAgentJobs, ResearchAgentDailyNotes, ResearchAgentStorage, ResearchAgentMemory */

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
    setSectionSummary(item ? `当前文献：${item.getField("title") || "未命名文献"}` : "聊天、会话与知识库");
    if (body.querySelector(".research-agent")) return;
    this.mount(body, doc, item);
  },

  mount(body, doc, initialItem) {
    const style = doc.createElement("style");
    style.textContent = `
      .research-agent { --ra-accent:#3478c5; --ra-accent-weak:#e9f2ff; --ra-border:color-mix(in srgb, currentColor 15%, transparent); display:flex; flex-direction:column; gap:10px; height:min(78vh, 980px); min-height:540px; font:menu; color:var(--fill-primary,#1d2733); }
      @media (prefers-color-scheme:dark) { .research-agent { --ra-accent:#7cb7ff; --ra-accent-weak:#1b3552; } }
      .research-agent-top { display:flex; gap:5px; padding:3px; border:1px solid var(--ra-border); border-radius:10px; background:color-mix(in srgb,var(--ra-accent) 5%,transparent); }
      .research-agent-tab { flex:1; min-height:30px; border:0; border-radius:7px; background:transparent; color:inherit; font:menu; font-weight:650; cursor:pointer; }
      .research-agent-tab:hover { background:color-mix(in srgb,var(--ra-accent) 10%,transparent); }.research-agent-tab.is-active{background:var(--ra-accent);color:#fff;box-shadow:0 1px 4px color-mix(in srgb,var(--ra-accent) 35%,transparent)}
      .research-agent-status { padding:7px 9px; border-radius:8px; background:var(--ra-accent-weak); color:color-mix(in srgb,var(--ra-accent) 78%,currentColor); font-size:.9em; line-height:1.35; }.research-agent-panel{display:none;min-height:0}.research-agent-panel.is-active{display:flex;flex:1;flex-direction:column;gap:10px}
      .research-agent-sessionbar { display:flex; align-items:center; gap:6px; }.research-agent-session-title { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; }.research-agent button { min-height:29px; padding:5px 9px; border:1px solid var(--ra-border); border-radius:7px; background:var(--material-sidepane,#fff); color:inherit; font:menu; cursor:pointer; }.research-agent button:hover:not(:disabled){border-color:var(--ra-accent);background:var(--ra-accent-weak)}.research-agent button:disabled{cursor:wait;opacity:.65}.research-agent-primary{border-color:var(--ra-accent)!important;background:var(--ra-accent)!important;color:#fff!important;font-weight:650!important}.research-agent-session-button{flex:0 0 auto}
      .research-agent-session-drawer { display:none; flex-direction:column; gap:8px; padding:10px; border:1px solid var(--ra-border); border-radius:10px; background:color-mix(in srgb,var(--ra-accent) 4%,transparent); }.research-agent-session-drawer.is-open{display:flex}.research-agent-session-list{display:flex;flex-direction:column;gap:5px;max-height:230px;overflow:auto}.research-agent-session-item{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;text-align:left}.research-agent-session-item.is-active{border-color:var(--ra-accent);background:var(--ra-accent-weak)}.research-agent-session-item small{color:var(--fill-secondary,#687583)}.research-agent-session-actions{display:flex;flex-wrap:wrap;gap:6px}.research-agent-session-toggle{display:flex;align-items:center;gap:6px;color:var(--fill-secondary,#687583);font-size:.88em}
      .research-agent-rag { display:flex; flex-wrap:wrap; align-items:center; gap:7px; padding:8px 10px; border:1px solid var(--ra-border); border-radius:10px; background:color-mix(in srgb,var(--ra-accent) 3%,transparent); }.research-agent-rag label{display:flex;align-items:center;gap:5px;font-weight:650}.research-agent-rag select{flex:1;min-width:150px;box-sizing:border-box;min-height:28px;border:1px solid var(--ra-border);border-radius:6px;background:var(--material-sidepane,#fff);color:inherit;font:menu}.research-agent-rag select:disabled{opacity:.55}.research-agent-rag-note{width:100%;color:var(--fill-secondary,#687583);font-size:.82em}
      .research-agent-context{padding:9px 10px;border:1px solid var(--ra-border);border-radius:10px;background:color-mix(in srgb,var(--ra-accent) 4%,transparent)}.research-agent-context-label{display:block;margin-bottom:3px;color:var(--fill-secondary,#687583);font-size:.82em;font-weight:600}.research-agent-selected-item{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;font-weight:650;line-height:1.35}
      .research-agent-log{flex:1;min-height:200px;overflow:auto;padding:12px;border:1px solid var(--ra-border);border-radius:11px;background:var(--material-sidepane,#fff);box-shadow:inset 0 1px 0 color-mix(in srgb,currentColor 4%,transparent);line-height:1.48}.research-agent-message{margin:0 0 12px;padding:8px 10px;border-radius:9px;background:color-mix(in srgb,currentColor 4%,transparent)}.research-agent-message:last-child{margin-bottom:0}.research-agent-message.is-user{background:var(--ra-accent-weak)}.research-agent-role{display:block;margin-bottom:3px;color:var(--ra-accent);font-size:.84em;font-weight:700}.research-agent-message-content{white-space:pre-wrap}.research-agent-message-actions{display:flex;justify-content:flex-end;gap:5px;margin-top:7px}.research-agent-message-actions button{min-height:24px;padding:2px 6px;font-size:.8em}
      .research-agent-response{background:var(--material-sidepane,#fff);border:1px solid color-mix(in srgb,var(--ra-accent) 18%,var(--ra-border))}.research-agent-answer{min-height:1.4em;white-space:pre-wrap}.research-agent-trace{margin-top:9px;border:1px solid color-mix(in srgb,currentColor 10%,transparent);border-radius:8px;background:color-mix(in srgb,currentColor 2.5%,transparent)}.research-agent-trace summary{padding:7px 9px;color:var(--fill-secondary,#687583);cursor:pointer;font-size:.86em;font-weight:600}.research-agent-trace-body{display:flex;flex-direction:column;gap:5px;padding:0 8px 8px}.research-agent-trace-reasoning{padding:7px 8px;border-radius:6px;background:color-mix(in srgb,currentColor 3.5%,transparent);color:var(--fill-secondary,#687583);font-size:.88em;line-height:1.42;white-space:pre-wrap}.research-agent-tool-event{padding:6px 8px;border-radius:6px;background:#f1f3f5;color:#69727d;font-size:.84em;line-height:1.38}@media(prefers-color-scheme:dark){.research-agent-tool-event{background:#262b31;color:#b8c0ca}}
      .research-agent-citations{display:none;margin-top:10px;padding-top:9px;border-top:1px solid var(--ra-border)}.research-agent-citations.has-items{display:block}.research-agent-citations-title{margin-bottom:6px;color:var(--fill-secondary,#687583);font-size:.82em;font-weight:700}.research-agent-citation-list{display:flex;flex-wrap:wrap;gap:5px}.research-agent-citation{max-width:100%;overflow:hidden;padding:4px 7px;border-radius:999px;background:var(--ra-accent-weak);color:var(--ra-accent);font-size:.82em;overflow-wrap:anywhere;text-decoration:none}a.research-agent-citation:hover{text-decoration:underline}
      .research-agent-composer{display:flex;flex-direction:column;gap:7px}.research-agent textarea{box-sizing:border-box;width:100%;min-height:108px;max-height:34vh;padding:10px;resize:vertical;border:1px solid var(--ra-border);border-radius:10px;background:var(--material-sidepane,#fff);color:inherit;font:menu;line-height:1.42}.research-agent textarea:focus{outline:2px solid color-mix(in srgb,var(--ra-accent) 48%,transparent);outline-offset:1px}.research-agent-sendline{display:flex;align-items:center;justify-content:space-between;gap:8px}.research-agent-hint{color:var(--fill-secondary,#687583);font-size:.82em}.research-agent-remaining{margin-left:auto;color:var(--fill-secondary,#687583);font-size:.82em;white-space:nowrap}.research-agent-remaining.warning{color:#a56812}.research-agent-remaining.over{color:#a53c3c;font-weight:650}
      .research-agent-card{display:flex;flex-direction:column;gap:9px;padding:11px;border:1px solid var(--ra-border);border-radius:11px;background:color-mix(in srgb,currentColor 2%,transparent)}.research-agent-card-title{font-weight:700}.research-agent-card-copy{margin:0;color:var(--fill-secondary,#687583);font-size:.9em;line-height:1.38}.research-agent-actions{display:flex;flex-wrap:wrap;gap:6px}.research-agent-progress{width:100%;height:6px;accent-color:var(--ra-accent)}.research-agent-entry-list{flex:1;min-height:145px;width:100%;box-sizing:border-box;border:1px solid var(--ra-border);border-radius:8px;background:var(--material-sidepane,#fff);color:inherit;font:menu}.research-agent-entry-list option{padding:5px}
    `;
    body.append(style);
    const root = doc.createElement("div"); root.className = "research-agent";
    const status = doc.createElement("div"); status.className = "research-agent-status"; status.textContent = "正在载入本地会话…";
    const tabs = doc.createElement("div"); tabs.className = "research-agent-top";
    const chatPanel = doc.createElement("section"); chatPanel.className = "research-agent-panel is-active";
    const knowledgePanel = doc.createElement("section"); knowledgePanel.className = "research-agent-panel";
    const sessionTab = this.button(doc, "会话", () => drawer.classList.toggle("is-open")); sessionTab.classList.add("research-agent-session-button");
    const chatTab = this.button(doc, "✦ 聊天", () => activate("chat")); chatTab.classList.add("research-agent-tab", "is-active");
    const knowledgeTab = this.button(doc, "▦ 知识库", () => activate("knowledge")); knowledgeTab.classList.add("research-agent-tab"); tabs.append(sessionTab, chatTab, knowledgeTab);
    const activate = (page) => { const chat = page === "chat"; chatPanel.classList.toggle("is-active", chat); knowledgePanel.classList.toggle("is-active", !chat); chatTab.classList.toggle("is-active", chat); knowledgeTab.classList.toggle("is-active", !chat); if (!chat) refreshEntries().catch((error) => { Zotero.logError(error); status.textContent = `错误：${error.message}`; }); };

    const state = { active: null, summaries: [], knowledgeBases: [] };
    const sessionBar = doc.createElement("div"); sessionBar.className = "research-agent-sessionbar";
    const sessionTitle = doc.createElement("div"); sessionTitle.className = "research-agent-session-title";
    const newSession = this.button(doc, "新对话", () => createSession()); newSession.classList.add("research-agent-primary"); sessionBar.append(sessionTitle, newSession);
    const drawer = doc.createElement("div"); drawer.className = "research-agent-session-drawer";
    const sessionList = doc.createElement("div"); sessionList.className = "research-agent-session-list";
    const syncToggle = doc.createElement("input"); syncToggle.type = "checkbox"; syncToggle.checked = Boolean(Zotero.Prefs.get("extensions.researchAgent.syncItemOnConversationSwitch"));
    const syncLabel = doc.createElement("label"); syncLabel.className = "research-agent-session-toggle"; syncLabel.append(syncToggle, doc.createTextNode("切换会话时联动左侧文献"));
    syncToggle.addEventListener("change", () => Zotero.Prefs.set("extensions.researchAgent.syncItemOnConversationSwitch", syncToggle.checked));
    const bindPaper = this.button(doc, "关联当前文献", () => bindCurrentPaper());
    drawer.append(sessionList, bindPaper, syncLabel);
    const rag = doc.createElement("div"); rag.className = "research-agent-rag";
    const ragToggle = doc.createElement("input"); ragToggle.type = "checkbox";
    const ragLabel = doc.createElement("label"); ragLabel.append(ragToggle, doc.createTextNode("启用知识库检索（RAG）"));
    const ragSelect = doc.createElement("select"); ragSelect.disabled = true;
    const ragNote = doc.createElement("span"); ragNote.className = "research-agent-rag-note"; ragNote.textContent = "未启用 RAG：仅分析当前左侧论文，不连接知识库或网络工具。";
    rag.append(ragLabel, ragSelect, ragNote);
    const context = doc.createElement("div"); context.className = "research-agent-context";
    const contextLabel = doc.createElement("span"); contextLabel.className = "research-agent-context-label"; contextLabel.textContent = "本会话关联文献";
    const selected = doc.createElement("div"); selected.className = "research-agent-selected-item"; context.append(contextLabel, selected);
    const log = doc.createElement("div"); log.className = "research-agent-log";
    const composer = doc.createElement("div"); composer.className = "research-agent-composer";
    const input = doc.createElement("textarea"); input.placeholder = "输入你的问题…"; input.setAttribute("aria-label", "向研究助手提问");
    const remaining = doc.createElement("span"); remaining.className = "research-agent-remaining";
    const send = this.button(doc, "发送", () => ask()); send.classList.add("research-agent-primary");
    const sendLine = doc.createElement("div"); sendLine.className = "research-agent-sendline";
    const hint = doc.createElement("span"); hint.className = "research-agent-hint"; hint.textContent = "⌘ / Ctrl + Enter 发送"; sendLine.append(hint, remaining, send);
    composer.append(input, sendLine); chatPanel.append(sessionBar, drawer, rag, context, log, composer);
    const resizeInput = () => { input.style.height = "auto"; input.style.height = `${Math.min(Math.max(input.scrollHeight, 108), Math.max(150, doc.defaultView.innerHeight * .34))}px`; };
    const updateRemaining = () => {
      const limit = ResearchAgentMemory.limit();
      const left = state.active ? ResearchAgentMemory.remaining(state.active, input.value) : limit;
      const used = Math.max(0, limit - left);
      remaining.textContent = `${this.formatTokens(used)}/${this.formatTokens(limit)}`;
      remaining.classList.toggle("warning", left >= 0 && left < ResearchAgentMemory.limit() * .1);
      remaining.classList.toggle("over", left < 0);
    };
    input.addEventListener("input", () => { resizeInput(); updateRemaining(); });
    input.addEventListener("keydown", (event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); ask(); } });

    const currentItem = () => {
      const item = Zotero.getActiveZoteroPane()?.getSelectedItems()?.[0];
      return item?.isRegularItem?.() ? item : item?.parentItem;
    };
    const refreshRagBases = async () => {
      const previous = ragSelect.value;
      state.knowledgeBases = await ResearchAgentIndexer.listKnowledgeBases();
      ragSelect.replaceChildren();
      const placeholder = doc.createElement("option"); placeholder.value = ""; placeholder.textContent = state.knowledgeBases.length ? "请选择知识库…" : "没有可用的已嵌入知识库"; ragSelect.append(placeholder);
      for (const base of state.knowledgeBases) { const option = doc.createElement("option"); option.value = base.id; option.textContent = `${base.title}（${base.articleCount} 篇）`; ragSelect.append(option); }
      if (state.knowledgeBases.some((base) => base.id === previous)) ragSelect.value = previous;
    };
    ragToggle.addEventListener("change", () => {
      ragSelect.disabled = !ragToggle.checked;
      if (ragToggle.checked) {
        ragNote.textContent = "请选择一个已嵌入的知识库；检索仅在该范围内进行。";
        refreshRagBases().catch((error) => { Zotero.logError(error); status.textContent = `无法读取知识库：${error.message}`; });
      } else {
        ragNote.textContent = "未启用 RAG：仅分析当前左侧论文，不连接知识库或网络工具。";
      }
    });
    const renderSessions = () => {
      sessionList.replaceChildren();
      for (const summary of state.summaries) {
        const entry = this.button(doc, summary.title, () => loadSession(summary.id));
        entry.classList.add("research-agent-session-item"); entry.classList.toggle("is-active", summary.id === state.active?.id);
        const meta = doc.createElement("small"); meta.textContent = `${summary.paper?.title || "未关联文献"} · ${this.shortDate(summary.updatedAt)}`;
        entry.append(meta); sessionList.append(entry);
      }
    };
    const renderCitations = (target, citations) => {
      if (!citations?.length) return;
      const box = doc.createElement("div"); box.className = "research-agent-citations has-items";
      const title = doc.createElement("div"); title.className = "research-agent-citations-title"; title.textContent = "引用文献与来源";
      const list = doc.createElement("div"); list.className = "research-agent-citation-list";
      for (const citation of citations) { const entry = citation.url ? doc.createElement("a") : doc.createElement("span"); entry.className = "research-agent-citation"; entry.textContent = citation.label || citation.value; if (citation.url) { entry.href = citation.url; entry.target = "_blank"; } list.append(entry); }
      box.append(title, list); target.append(box);
    };
    const renderConversation = () => {
      log.replaceChildren();
      if (!state.active) return;
      sessionTitle.textContent = state.active.title || "新对话";
      selected.textContent = state.active.paper?.title || "未关联文献；可在会话面板中关联当前文献。";
      if (!state.active.messages.length) this.addMessage(doc, log, "助手", "这是一个本地保存的新会话。你可以提问，或先关联一篇当前文献。", false);
      for (const message of state.active.messages) {
        const item = this.addMessage(doc, log, message.role === "user" ? "你" : "助手", message.content, message.role === "user", message.role === "assistant" ? message.citations : null);
        const actions = doc.createElement("div"); actions.className = "research-agent-message-actions";
        if (message.role === "user") {
          actions.append(this.button(doc, "编辑", () => editMessage(message)), this.button(doc, "撤回", () => retractMessage(message)));
        } else {
          actions.append(this.button(doc, "编辑", () => editMessage(message)), this.button(doc, "撤回此轮", () => retractAssistantTurn(message)));
        }
        item.append(actions);
      }
      log.scrollTop = log.scrollHeight;
      updateRemaining();
    };
    const persistActiveID = async () => { const appState = await ResearchAgentStorage.getState(); appState.activeConversationID = state.active?.id || null; await ResearchAgentStorage.saveState(appState); };
    const syncPaper = async () => {
      if (!syncToggle.checked || !state.active?.paper?.itemID) return;
      try { await Zotero.getActiveZoteroPane().selectItem(state.active.paper.itemID); } catch (error) { Zotero.logError(error); }
    };
    const loadSession = async (id) => {
      const conversation = await ResearchAgentStorage.getConversation(id);
      if (!conversation) return;
      state.active = conversation; await persistActiveID(); renderConversation(); await syncPaper();
    };
    const createSession = async () => {
      state.active = await ResearchAgentStorage.createConversation({ item: currentItem() || initialItem });
      state.summaries = await ResearchAgentStorage.listConversations(); drawer.classList.remove("is-open"); await persistActiveID(); renderSessions(); renderConversation(); status.textContent = "已创建新会话。";
    };
    const bindCurrentPaper = async () => {
      const item = currentItem();
      if (!item) { status.textContent = "请先在左侧文献列表选中一篇论文。"; return; }
      state.active.paper = ResearchAgentStorage.paperFromItem(item); await ResearchAgentStorage.saveConversation(state.active); state.summaries = await ResearchAgentStorage.listConversations(); renderSessions(); renderConversation(); status.textContent = "已关联当前文献。";
    };
    const editMessage = async (message) => {
      const content = doc.defaultView.prompt("编辑消息。编辑后将撤回该消息之后的回答。", message.content);
      if (content === null || !content.trim()) return;
      await ResearchAgentStorage.editAndRetractAfter(state.active, message.id, content); state.summaries = await ResearchAgentStorage.listConversations(); renderSessions(); renderConversation(); status.textContent = "消息已编辑，后续回答已撤回。";
    };
    const retractMessage = async (message) => {
      if (!doc.defaultView.confirm("撤回这条消息及其后的内容？")) return;
      await ResearchAgentStorage.retractFrom(state.active, message.id); state.summaries = await ResearchAgentStorage.listConversations(); renderSessions(); renderConversation(); status.textContent = "已撤回。";
    };
    const retractAssistantTurn = async (message) => {
      const index = state.active.messages.findIndex((entry) => entry.id === message.id);
      const user = [...state.active.messages.slice(0, index)].reverse().find((entry) => entry.role === "user");
      if (user) await retractMessage(user);
    };
    const ask = async () => {
      const question = input.value.trim();
      if (!question || send.disabled || !state.active) return;
      let ragConfig;
      if (ragToggle.checked) {
        const selectedBase = state.knowledgeBases.find((base) => base.id === ragSelect.value);
        if (!selectedBase) { status.textContent = "启用 RAG 后，请先选择一个具体知识库。"; return; }
        ragConfig = { enabled: true, collectionIDs: [selectedBase.id], knowledgeBaseTitle: selectedBase.title };
      } else {
        const paper = currentItem();
        if (!paper) { status.textContent = "未启用 RAG 时，请先在左侧选择一篇论文。"; return; }
        try { ragConfig = { enabled: false, paperContext: await ResearchAgentIndexer.paperContext(paper) }; }
        catch (error) { status.textContent = `无法读取当前论文：${error.message}`; return; }
      }
      await ResearchAgentStorage.appendMessage(state.active, "user", question);
      state.summaries = await ResearchAgentStorage.listConversations(); renderSessions();
      this.addMessage(doc, log, "你", question, true);
      input.value = ""; resizeInput(); updateRemaining(); send.disabled = true; status.textContent = "正在检索、整理记忆并生成回答…";
      const responseView = this.createResponseView(doc, log);
      try {
        const result = await ResearchAgentAgent.answer(question, { conversation: state.active, rag: ragConfig, onEvent: (event) => responseView.handle(event) });
        responseView.finish(result);
        await ResearchAgentStorage.appendMessage(state.active, "assistant", result.answer, { citations: result.citations, trace: responseView.trace() });
        state.summaries = await ResearchAgentStorage.listConversations(); renderSessions(); updateRemaining(); status.textContent = "回答完成，已保存到本地会话文件。";
      } catch (error) { Zotero.logError(error); responseView.fail(error); status.textContent = `错误：${error.message}`; }
      finally { send.disabled = false; input.focus(); }
    };
    const initializeSessions = async () => {
      state.summaries = await ResearchAgentStorage.listConversations();
      const appState = await ResearchAgentStorage.getState();
      const preferred = appState.activeConversationID && await ResearchAgentStorage.getConversation(appState.activeConversationID);
      state.active = preferred || (state.summaries[0] && await ResearchAgentStorage.getConversation(state.summaries[0].id));
      if (!state.active) state.active = await ResearchAgentStorage.createConversation({ item: initialItem });
      state.summaries = await ResearchAgentStorage.listConversations(); renderSessions(); renderConversation(); status.textContent = "就绪。会话均保存于本地独立文件。";
    };

    const indexCard = doc.createElement("div"); indexCard.className = "research-agent-card";
    const indexTitle = doc.createElement("div"); indexTitle.className = "research-agent-card-title"; indexTitle.textContent = "嵌入文献";
    const indexCopy = doc.createElement("p"); indexCopy.className = "research-agent-card-copy"; indexCopy.textContent = "嵌入任务在后台顺序执行，不会阻塞 Zotero 的其他操作。";
    const actions = doc.createElement("div"); actions.className = "research-agent-actions";
    const progress = doc.createElement("progress"); progress.className = "research-agent-progress"; progress.max = 1; progress.value = 0;
    const updateProgress = (event) => { progress.max = Math.max(1, event.total); progress.value = event.completed; status.textContent = `${event.label}：${event.completed}/${event.total} 篇文献${event.cancelled ? "（正在取消）" : ""}`; };
    const startJob = async (start) => { try { const job = await start(updateProgress); updateProgress(job); const result = await job.promise; status.textContent = `${result.state}：已处理 ${result.completed}/${result.total} 篇文献。`; await refreshEntries(); } catch (error) { Zotero.logError(error); status.textContent = `错误：${error.message}`; } };
    actions.append(this.button(doc, "嵌入当前分类", () => startJob((callback) => ResearchAgentIndexer.startCurrentCollection(callback))), this.button(doc, "嵌入所选文献", () => startJob((callback) => ResearchAgentIndexer.startSelectedArticles(callback))), this.button(doc, "嵌入全部文献", () => startJob((callback) => ResearchAgentIndexer.startAllArticles(callback))), this.button(doc, "取消任务", () => ResearchAgentJobs.cancel())); indexCard.append(indexTitle, indexCopy, actions, progress);
    const management = doc.createElement("div"); management.className = "research-agent-card";
    const managementTitle = doc.createElement("div"); managementTitle.className = "research-agent-card-title"; managementTitle.textContent = "知识库条目";
    const entryCopy = doc.createElement("p"); entryCopy.className = "research-agent-card-copy"; entryCopy.textContent = "选择条目后可重嵌入或从本地知识库移除；不会删除 Zotero 中的原始文献。";
    const entries = doc.createElement("select"); entries.className = "research-agent-entry-list"; entries.multiple = true; entries.size = 7;
    const selectedKeys = () => [...entries.selectedOptions].map((option) => option.value);
    const refreshEntries = async () => { const records = await ResearchAgentIndexer.listEntries(); entries.replaceChildren(); for (const record of records) { const option = doc.createElement("option"); option.value = record.key; option.textContent = `${record.title} [${record.key}] — ${record.collectionPath.join(" / ")}`; entries.append(option); } if (!records.length) { const option = doc.createElement("option"); option.disabled = true; option.textContent = "尚未嵌入任何文献"; entries.append(option); } };
    const entryActions = doc.createElement("div"); entryActions.className = "research-agent-actions";
    entryActions.append(this.button(doc, "刷新", refreshEntries), this.button(doc, "重嵌入所选", () => startJob((callback) => ResearchAgentIndexer.startReembedEntries(selectedKeys(), callback))), this.button(doc, "移除所选", async () => { const keys = selectedKeys(); if (!keys.length || !doc.defaultView.confirm(`从本地知识库移除 ${keys.length} 个条目？Zotero 原始文献不会被删除。`)) return; status.textContent = await ResearchAgentIndexer.removeEntries(keys); await refreshEntries(); }), this.button(doc, "生成今日笔记", async () => { status.textContent = await ResearchAgentDailyNotes.runNow(); }));
    management.append(managementTitle, entryCopy, entries, entryActions); knowledgePanel.append(indexCard, management);
    root.append(tabs, status, chatPanel, knowledgePanel); body.append(root); resizeInput(); initializeSessions().catch((error) => { Zotero.logError(error); status.textContent = `无法载入会话：${error.message}`; });
  },

  button(doc, label, onClick) { const button = doc.createElement("button"); button.type = "button"; button.textContent = label; button.addEventListener("click", onClick); return button; },

  addMessage(doc, log, role, text, isUser, citations) {
    const message = doc.createElement("div"); message.className = `research-agent-message${isUser ? " is-user" : ""}`;
    const label = doc.createElement("span"); label.className = "research-agent-role"; label.textContent = role;
    const content = doc.createElement("div"); content.className = "research-agent-message-content"; content.textContent = text;
    message.append(label, content); if (citations?.length) this.addCitations(doc, message, citations); log.append(message); log.scrollTop = log.scrollHeight; return message;
  },

  addCitations(doc, parent, citations) {
    const box = doc.createElement("div"); box.className = "research-agent-citations has-items";
    const title = doc.createElement("div"); title.className = "research-agent-citations-title"; title.textContent = "引用文献与来源";
    const list = doc.createElement("div"); list.className = "research-agent-citation-list";
    for (const citation of citations) { const entry = citation.url ? doc.createElement("a") : doc.createElement("span"); entry.className = "research-agent-citation"; entry.textContent = citation.label || citation.value; if (citation.url) { entry.href = citation.url; entry.target = "_blank"; } list.append(entry); }
    box.append(title, list); parent.append(box);
  },

  createResponseView(doc, log) {
    const message = doc.createElement("div"); message.className = "research-agent-message research-agent-response";
    const label = doc.createElement("span"); label.className = "research-agent-role"; label.textContent = "助手";
    const answer = doc.createElement("div"); answer.className = "research-agent-answer"; answer.textContent = "正在准备回答…";
    const trace = doc.createElement("details"); trace.className = "research-agent-trace"; trace.open = true;
    const traceSummary = doc.createElement("summary"); traceSummary.textContent = "推理、记忆与检索过程";
    const traceBody = doc.createElement("div"); traceBody.className = "research-agent-trace-body"; trace.append(traceSummary, traceBody); message.append(label, answer, trace); log.append(message);
    let answerStarted = false; let reasoningBlock = null; const steps = [];
    const addTrace = (text, className = "research-agent-tool-event", type = "tool") => { const entry = doc.createElement("div"); entry.className = className; entry.textContent = text; traceBody.append(entry); steps.push({ type, text }); traceSummary.textContent = `推理、记忆与检索过程 · ${steps.length} 步`; log.scrollTop = log.scrollHeight; };
    const names = { search_knowledge_base: "检索本地知识库", search_web: "搜索网页", search_arxiv: "查询 arXiv", search_github_code: "检索 GitHub 源码" };
    const describe = (event) => `${names[event.name] || event.name}${event.args?.query ? ` · ${event.args.query}` : ""}`;
    return {
      handle: (event) => { if (event.type === "content") { if (!answerStarted) { answer.textContent = ""; answerStarted = true; } answer.append(doc.createTextNode(event.text)); } else if (event.type === "reasoning") { if (!reasoningBlock) { reasoningBlock = doc.createElement("div"); reasoningBlock.className = "research-agent-trace-reasoning"; traceBody.append(reasoningBlock); steps.push({ type: "reasoning", text: "" }); traceSummary.textContent = `推理、记忆与检索过程 · ${steps.length} 步`; } reasoningBlock.append(doc.createTextNode(event.text)); steps.at(-1).text += event.text; } else if (event.type === "memory") addTrace(event.text, "research-agent-tool-event", "memory"); else if (event.type === "tool-start") addTrace(`正在${describe(event)}`); else if (event.type === "tool-finish") addTrace(`${describe(event)} · 找到 ${event.count} 条结果`); else if (event.type === "tool-error") addTrace(`${describe(event)} · 调用失败：${event.error}`); },
      finish: (result) => { if (!answerStarted) answer.textContent = result.answer || "模型没有返回正文。"; if (!steps.length) addTrace("模型直接生成回答，未调用外部检索工具。"); trace.open = false; if (result.citations?.length) ResearchAgentSidebar.addCitations(doc, message, result.citations); log.scrollTop = log.scrollHeight; },
      fail: (error) => { answer.textContent = `回答失败：${error.message}`; addTrace("请求未完成；请检查模型配置或网络连接。"); trace.open = true; },
      trace: () => steps
    };
  },

  formatTokens(value) { const number = Math.max(0, Math.round(value)); return `${number >= 1000 ? `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}` : "0"}k`; },
  shortDate(value) { try { return new Date(value).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }); } catch (_) { return ""; } }
};
