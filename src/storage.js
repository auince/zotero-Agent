/* global Zotero */

var ResearchAgentStorage = {
  root: null,
  indexPath: null,
  conversationsPath: null,
  settingsPath: null,

  async initialize() {
    this.root = this.join(Zotero.DataDirectory.dir, "research-agent");
    this.indexPath = this.join(this.root, "knowledge-index.json");
    this.conversationsPath = this.join(this.root, "conversations.jsonl");
    this.settingsPath = this.join(this.root, "state.json");
    await Zotero.File.createDirectoryIfMissingAsync(this.root);
  },

  join(base, ...segments) {
    const file = Zotero.File.pathToFile(base).clone();
    for (const segment of segments) file.append(segment);
    return file.path;
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
    await Zotero.File.putContentsAsync(path, JSON.stringify(value, null, 2));
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
    await Zotero.File.putContentsAsync(this.conversationsPath, `${existing}${JSON.stringify(entry)}\n`);
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
    return this.join(this.root, "notes");
  },

  async writeNote(filename, content) {
    const notes = this.notesDirectory();
    await Zotero.File.createDirectoryIfMissingAsync(notes);
    const path = this.join(notes, filename);
    await Zotero.File.putContentsAsync(path, content);
    return path;
  },

  openVault() {
    Zotero.launchFile(Zotero.File.pathToFile(this.root));
  }
};
