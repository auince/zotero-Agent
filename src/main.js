/* global Services, Zotero */

for (const module of ["storage", "jobs", "semantic", "indexer", "tools", "agent", "daily-notes", "sidebar"]) {
  Services.scriptloader.loadSubScript(`${ResearchAgentRootURI}src/${module}.js`);
}

var ResearchAgent = {
  id: "research-agent@zotero.example.com",
  rootURI: null,
  windows: new Set(),
  timer: null,

  async startup({ rootURI: pluginRootURI }) {
    this.rootURI = pluginRootURI;
    Zotero.PreferencePanes.register({
      pluginID: this.id,
      src: this.rootURI + "prefs.xhtml"
    });
    await ResearchAgentStorage.initialize();
    ResearchAgentSidebar.register(this.rootURI);
    this.timer = setInterval(() => ResearchAgentDailyNotes.runIfDue().catch(Zotero.logError), 60 * 60 * 1000);
    ResearchAgentDailyNotes.runIfDue().catch(Zotero.logError);
    Zotero.debug("Research Agent started");
  },

  shutdown() {
    clearInterval(this.timer);
    ResearchAgentJobs.cancel();
    ResearchAgentSidebar.unregister();
    this.windows.clear();
  },

  onMainWindowLoad(window) {
    this.windows.add(window);
  },

  onMainWindowUnload(window) {
    this.windows.delete(window);
  }
};
