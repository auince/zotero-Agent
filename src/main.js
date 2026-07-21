/* global Services, Zotero */

for (const module of ["storage", "indexer", "tools", "agent", "daily-notes"]) {
  Services.scriptloader.loadSubScript(`${ResearchAgentRootURI}src/${module}.js`);
}

var ResearchAgent = {
  id: "research-agent@zotero.local",
  rootURI: null,
  windows: new Set(),
  timer: null,

  startup({ rootURI: pluginRootURI }) {
    this.rootURI = pluginRootURI;
    ResearchAgentStorage.initialize();
    Zotero.PreferencePanes.register({
      pluginID: this.id,
      src: this.rootURI + "prefs.xhtml"
    });
    this.timer = setInterval(() => ResearchAgentDailyNotes.runIfDue().catch(Zotero.logError), 60 * 60 * 1000);
    ResearchAgentDailyNotes.runIfDue().catch(Zotero.logError);
    Zotero.debug("Research Agent started");
  },

  shutdown() {
    clearInterval(this.timer);
    for (const window of this.windows) window.document.getElementById("research-agent-menuitem")?.remove();
    this.windows.clear();
  },

  onMainWindowLoad(window) {
    this.windows.add(window);
    const popup = window.document.getElementById("menu_ToolsPopup");
    if (!popup || window.document.getElementById("research-agent-menuitem")) return;
    const item = window.document.createXULElement("menuitem");
    item.id = "research-agent-menuitem";
    item.setAttribute("label", "Research Agent");
    item.addEventListener("command", () => this.openChat(window));
    popup.append(item);
    window.ResearchAgentPlugin = {
      ask: (question) => ResearchAgentAgent.answer(question),
      indexCurrentCollection: () => ResearchAgentIndexer.indexCurrentCollection(),
      updateDailyNote: () => ResearchAgentDailyNotes.runNow(),
      openVault: () => ResearchAgentStorage.openVault()
    };
  },

  onMainWindowUnload(window) {
    this.windows.delete(window);
    delete window.ResearchAgentPlugin;
  },

  openChat(window) {
    window.openDialog("chrome://research-agent/content/chat.xhtml", "research-agent-chat", "chrome,resizable,centerscreen");
  }
};
