/* global Zotero */

var ResearchAgentDailyNotes = {
  async runIfDue() {
    if (!Zotero.Prefs.get("extensions.researchAgent.dailyNotesEnabled")) return;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const day = this.dayKey(yesterday);
    const state = await ResearchAgentStorage.getState();
    if (state.processedDays[day]) return;
    const note = await this.create(day);
    if (note) {
      state.processedDays[day] = new Date().toISOString();
      await ResearchAgentStorage.saveState(state);
    }
  },

  async runNow() {
    const day = this.dayKey(new Date());
    const path = await this.create(day);
    return path ? `Daily note updated: ${path}` : "There are no conversations to summarize today.";
  },

  dayKey(date) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date - offset).toISOString().slice(0, 10);
  },

  async create(day) {
    const entries = (await ResearchAgentStorage.getConversations()).filter((entry) => entry.at?.slice(0, 10) === day);
    if (!entries.length) return null;
    const digest = await this.summarize(entries, day);
    const cited = [...new Set(entries.flatMap((entry) => entry.citations || []).filter((citation) => citation.type === "zotero").map((citation) => citation.value))];
    const markdown = [
      `# ${digest.title}`,
      "",
      `Date: ${day}`,
      "",
      "## Questions",
      ...digest.questions.map((question) => `- ${question}`),
      "",
      "## Thinking and conclusions",
      ...digest.insights.map((insight) => `- ${insight}`),
      "",
      "## Papers mentioned",
      ...(cited.length ? cited.map((citation) => `- ${citation}`) : ["- No Zotero papers were cited in this day's conversations."]),
      "",
      "## Conversation digest",
      digest.digest,
      ""
    ].join("\n");
    const filename = `${day}-${this.slug(digest.title)}.md`;
    return ResearchAgentStorage.writeNote(filename, markdown);
  },

  async summarize(entries, day) {
    const fallback = {
      title: this.fallbackTitle(entries[0].question),
      questions: entries.map((entry) => this.clean(entry.question)).slice(0, 6),
      insights: entries.map((entry) => this.clean(entry.answer)).slice(0, 4),
      digest: `${entries.length} research conversation${entries.length === 1 ? "" : "s"} were captured. Review the questions and cited papers above.`
    };
    const apiKey = Zotero.Prefs.get("extensions.researchAgent.deepseekAPIKey");
    if (!apiKey) return fallback;
    const transcript = entries.map((entry, index) => `Conversation ${index + 1}\nQuestion: ${entry.question}\nAnswer: ${entry.answer}`).join("\n\n").slice(0, 50000);
    try {
      const raw = await ResearchAgentTools.request("POST", `${(Zotero.Prefs.get("extensions.researchAgent.deepseekBaseURL") || "https://api.deepseek.com").replace(/\/$/, "")}/chat/completions`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: Zotero.Prefs.get("extensions.researchAgent.deepseekModel") || "deepseek-chat",
          temperature: 0.1,
          messages: [{
            role: "system",
            content: "Turn the research conversations into a compact reusable note. Return ONLY JSON with title (max 12 words), questions (max 5 terse strings), insights (max 5 terse strings), and digest (max 90 words). Preserve uncertainty; do not invent facts."
          }, { role: "user", content: `Date: ${day}\n\n${transcript}` }],
          response_format: { type: "json_object" }
        })
      });
      const content = JSON.parse(raw).choices?.[0]?.message?.content;
      const digest = JSON.parse(content);
      if (!digest.title || !Array.isArray(digest.questions) || !Array.isArray(digest.insights)) return fallback;
      return { title: this.clean(digest.title), questions: digest.questions.map(this.clean).filter(Boolean), insights: digest.insights.map(this.clean).filter(Boolean), digest: this.clean(digest.digest) };
    } catch (error) {
      Zotero.logError(error);
      return fallback;
    }
  },

  clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  },

  fallbackTitle(question) {
    return this.clean(question).replace(/[?？].*$/, "").slice(0, 56) || "Research questions";
  },

  slug(title) {
    return this.clean(title).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "research-note";
  }
};
