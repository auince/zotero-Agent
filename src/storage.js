/* global OS, PathUtils, Zotero */

var ResearchAgentStorage = {
  root: null,
  indexPath: null,
  conversationsPath: null,
  settingsPath: null,

  initialize() {
    this.root = PathUtils.join(Zotero.DataDirectory.dir, "research-agent");
    this.indexPath = PathUtils.join(this.root, "knowledge-index.json");
    this.conversationsPath = PathUtils.join(this.root, "conversations.jsonl");
    this.settingsPath = PathUtils.join(this.root, "state.json");
    return OS.File.makeDir(this.root, { ignoreExisting: true });
  },

  async readJSON(path, fallback) {
    await this.initialize();
    try {
      return JSON.parse(await Zotero.File.getContentsAsync(path));
    } catch (error) {
      if (error.name === "NotFoundError" || /no such file/i.test(error.message)) return fallback;
      throw error;
    }
  },

  async writeJSON(path, value) {
    await this.initialize();
    await OS.File.writeAtomic(path, JSON.stringify(value, null, 2), { tmpPath: `${path}.tmp` });
  },

  async getIndex() {
    return this.readJSON(this.indexPath, { version: 1, updatedAt: null, collections: {}, articles: {}, chunks: [] });
  },

  async saveIndex(index) {
    index.updatedAt = new Date().toISOString();
    await this.writeJSON(this.indexPath, index);
  },

  async appendConversation(entry) {
    await this.initialize();
    let existing = "";
    try { existing = await Zotero.File.getContentsAsync(this.conversationsPath); } catch (_) {}
    await OS.File.writeAtomic(this.conversationsPath, `${existing}${JSON.stringify(entry)}\n`, {
      tmpPath: `${this.conversationsPath}.tmp`
    });
  },

  async getConversations() {
    await this.initialize();
    try {
      const lines = (await Zotero.File.getContentsAsync(this.conversationsPath)).split("\n").filter(Boolean);
      return lines.map((line) => JSON.parse(line));
    } catch (error) {
      if (error.name === "NotFoundError" || /no such file/i.test(error.message)) return [];
      throw error;
    }
  },

  async getState() {
    return this.readJSON(this.settingsPath, { processedDays: {} });
  },

  async saveState(state) {
    await this.writeJSON(this.settingsPath, state);
  },

  notesDirectory() {
    return PathUtils.join(this.root, "notes");
  },

  async writeNote(filename, content) {
    const notes = this.notesDirectory();
    await OS.File.makeDir(notes, { ignoreExisting: true });
    const path = PathUtils.join(notes, filename);
    await OS.File.writeAtomic(path, content, { tmpPath: `${path}.tmp` });
    return path;
  },

  openVault() {
    Zotero.launchFile(this.root);
  }
};
