/* global Zotero */

var ResearchAgentAgent = {
  systemPrompt: `You are a Zotero research agent. Use search_knowledge_base before making claims about the user's library. Use search_web for current external facts, search_arxiv for scholarly preprints, and search_github_code for implementation questions. Cite Zotero evidence as [item key] and external sources as Markdown links. Be concise, distinguish evidence from inference, and do not invent sources.`,

  async answer(question) {
    const apiKey = Zotero.Prefs.get("extensions.researchAgent.deepseekAPIKey");
    if (!apiKey) throw new Error("Set a DeepSeek API key in Settings → Research Agent before asking questions.");
    const messages = [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: question }
    ];
    const citations = [];
    for (let step = 0; step < 8; step++) {
      const message = await this.complete(messages, apiKey);
      if (!message.tool_calls?.length) {
        const answer = message.content || "The model returned no answer.";
        await ResearchAgentStorage.appendConversation({
          at: new Date().toISOString(), question, answer, citations
        });
        return answer;
      }
      messages.push({ role: "assistant", content: message.content || "", tool_calls: message.tool_calls });
      for (const call of message.tool_calls) {
        let args;
        try { args = JSON.parse(call.function.arguments || "{}"); } catch (_) { args = {}; }
        let result;
        try {
          result = await ResearchAgentTools.execute(call.function.name, args);
          citations.push(...this.extractCitations(call.function.name, result));
        } catch (error) {
          result = { error: error.message };
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result).slice(0, 24000) });
      }
    }
    throw new Error("Agent stopped after eight tool steps. Please narrow the question.");
  },

  async complete(messages, apiKey) {
    const baseURL = (Zotero.Prefs.get("extensions.researchAgent.deepseekBaseURL") || "https://api.deepseek.com").replace(/\/$/, "");
    const model = Zotero.Prefs.get("extensions.researchAgent.deepseekModel") || "deepseek-chat";
    const raw = await ResearchAgentTools.request("POST", `${baseURL}/chat/completions`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, tools: ResearchAgentTools.definitions, tool_choice: "auto", temperature: 0.2 }),
      responseType: "text"
    });
    const response = JSON.parse(raw);
    if (response.error) throw new Error(`DeepSeek: ${response.error.message || JSON.stringify(response.error)}`);
    return response.choices?.[0]?.message || {};
  },

  extractCitations(tool, result) {
    if (!Array.isArray(result)) return [];
    if (tool === "search_knowledge_base") return result.map((item) => ({ type: "zotero", value: item.citation }));
    return result.map((item) => ({ type: tool, value: item.url || item.repository || item.title })).filter((item) => item.value);
  }
};
