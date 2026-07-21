/* global Zotero */

var ResearchAgentStorage = {
  root: null,
  indexPath: null,
  conversationsPath: null,
  conversationIndexPath: null,
  conversationsDirectoryPath: null,
  settingsPath: null,

  async initialize() {
    if (this.root) return;
    this.root = this.join(Zotero.DataDirectory.dir, "research-agent");
    this.indexPath = this.join(this.root, "knowledge-index.json");
    this.conversationsPath = this.join(this.root, "conversations.jsonl");
    this.conversationIndexPath = this.join(this.root, "conversation-index.json");
    this.conversationsDirectoryPath = this.join(this.root, "conversations");
    this.settingsPath = this.join(this.root, "state.json");
    await Zotero.File.createDirectoryIfMissingAsync(this.root);
    await Zotero.File.createDirectoryIfMissingAsync(this.conversationsDirectoryPath);
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

  conversationPath(id) {
    return this.join(this.conversationsDirectoryPath, `${id}.json`);
  },

  makeConversationID() {
    return `conversation-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  },

  async getConversationIndex() {
    const index = await this.readJSON(this.conversationIndexPath, null);
    if (index) return index;
    const migrated = { version: 2, conversations: [] };
    await this.migrateLegacyConversations(migrated);
    await this.writeJSON(this.conversationIndexPath, migrated);
    return migrated;
  },

  async migrateLegacyConversations(index) {
    let entries = [];
    try { entries = (await Zotero.File.getContentsAsync(this.conversationsPath)).split("\n").filter(Boolean).map((line) => JSON.parse(line)); } catch (_) {}
    for (const entry of entries) {
      const conversation = this.newConversation({ title: this.titleFromText(entry.question), createdAt: entry.at });
      conversation.messages = [
        this.message("user", entry.question, entry.at),
        this.message("assistant", entry.answer, entry.at, { citations: entry.citations || [] })
      ];
      await this.saveConversation(conversation, index);
    }
  },

  newConversation({ title, item, createdAt } = {}) {
    const at = createdAt || new Date().toISOString();
    return {
      version: 2,
      id: this.makeConversationID(),
      title: title || "新对话",
      createdAt: at,
      updatedAt: at,
      paper: item ? this.paperFromItem(item) : null,
      messages: [],
      memory: { rootSummary: "", layers: [], compressedMessageIDs: [] }
    };
  },

  paperFromItem(item) {
    const regular = item?.isRegularItem?.() ? item : item?.parentItem;
    if (!regular) return null;
    return { key: regular.key, itemID: regular.id, libraryID: regular.libraryID, title: regular.getField("title") || "未命名文献" };
  },

  message(role, content, createdAt, extra = {}) {
    return { id: `message-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, role, content: String(content || ""), createdAt: createdAt || new Date().toISOString(), ...extra };
  },

  titleFromText(text) {
    return String(text || "新对话").replace(/\s+/g, " ").trim().slice(0, 34) || "新对话";
  },

  async createConversation(options = {}) {
    const conversation = this.newConversation(options);
    await this.saveConversation(conversation);
    return conversation;
  },

  async saveConversation(conversation, suppliedIndex) {
    await this.initialize();
    conversation.updatedAt = new Date().toISOString();
    conversation.messages ||= [];
    conversation.memory ||= { rootSummary: "", layers: [], compressedMessageIDs: [] };
    if (conversation.messages.length && (!conversation.title || conversation.title === "新对话")) {
      conversation.title = this.titleFromText(conversation.messages.find((message) => message.role === "user")?.content);
    }
    await this.writeJSON(this.conversationPath(conversation.id), conversation);
    const index = suppliedIndex || await this.getConversationIndex();
    const summary = {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      paper: conversation.paper || null,
      messageCount: conversation.messages.length
    };
    const position = index.conversations.findIndex((entry) => entry.id === conversation.id);
    if (position === -1) index.conversations.push(summary); else index.conversations[position] = summary;
    await this.writeJSON(this.conversationIndexPath, index);
    return conversation;
  },

  async listConversations() {
    const index = await this.getConversationIndex();
    return [...index.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async getConversation(id) {
    if (!id) return null;
    return this.readJSON(this.conversationPath(id), null);
  },

  async appendMessage(conversation, role, content, extra = {}) {
    const message = this.message(role, content, null, extra);
    conversation.messages.push(message);
    await this.saveConversation(conversation);
    return message;
  },

  async updateMessage(conversation, id, content) {
    const message = conversation.messages.find((entry) => entry.id === id);
    if (!message) throw new Error("找不到需要编辑的消息。");
    message.content = String(content || "").trim();
    message.editedAt = new Date().toISOString();
    await this.saveConversation(conversation);
    return message;
  },

  async retractFrom(conversation, id) {
    const index = conversation.messages.findIndex((message) => message.id === id);
    if (index === -1) throw new Error("找不到需要撤回的消息。");
    conversation.messages.splice(index);
    conversation.memory = { rootSummary: "", layers: [], compressedMessageIDs: [] };
    await this.saveConversation(conversation);
  },

  async editAndRetractAfter(conversation, id, content) {
    const index = conversation.messages.findIndex((message) => message.id === id);
    if (index === -1) throw new Error("找不到需要编辑的消息。");
    conversation.messages[index].content = String(content || "").trim();
    conversation.messages[index].editedAt = new Date().toISOString();
    conversation.messages.splice(index + 1);
    // Any change to historical text invalidates summaries derived from it.
    conversation.memory = { rootSummary: "", layers: [], compressedMessageIDs: [] };
    await this.saveConversation(conversation);
    return conversation.messages[index];
  },

  async appendConversation(entry) {
    // Backward-compatible entry point used by older plugin versions.
    const conversation = await this.createConversation({ title: this.titleFromText(entry.question), createdAt: entry.at });
    await this.appendMessage(conversation, "user", entry.question, { createdAt: entry.at });
    await this.appendMessage(conversation, "assistant", entry.answer, { createdAt: entry.at, citations: entry.citations || [] });
  },

  async getConversations() {
    const entries = [];
    for (const summary of await this.listConversations()) {
      const conversation = await this.getConversation(summary.id);
      if (!conversation) continue;
      for (let index = 0; index < conversation.messages.length; index++) {
        const message = conversation.messages[index];
        if (message.role !== "user") continue;
        const answer = conversation.messages.slice(index + 1).find((candidate) => candidate.role === "assistant");
        if (answer) entries.push({ at: answer.createdAt || message.createdAt, question: message.content, answer: answer.content, citations: answer.citations || [] });
      }
    }
    return entries;
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
