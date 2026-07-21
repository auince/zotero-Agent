/* global Zotero, DOMParser */

var ResearchAgentTools = {
  definitions: [
    {
      type: "function",
      function: {
        name: "search_knowledge_base",
        description: "Search indexed Zotero collections. Returns hierarchical citations at article or paragraph level.",
        parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 12 } }, required: ["query"] }
      }
    },
    {
      type: "function",
      function: {
        name: "search_web",
        description: "Search the public web for recent or external information. Cite result URLs in the final answer.",
        parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 10 } }, required: ["query"] }
      }
    },
    {
      type: "function",
      function: {
        name: "search_arxiv",
        description: "Search arXiv for papers. Use for preprints, authors, methods, and recent research.",
        parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 10 } }, required: ["query"] }
      }
    },
    {
      type: "function",
      function: {
        name: "search_github_code",
        description: "Search GitHub source code. A GitHub token is recommended and may be required by GitHub.",
        parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 10 } }, required: ["query"] }
      }
    }
  ],

  definitionsFor({ ragEnabled = true } = {}) {
    return ragEnabled ? this.definitions : [];
  },

  async execute(name, args, scope = {}) {
    switch (name) {
      case "search_knowledge_base": return ResearchAgentIndexer.search(args.query, args.limit || 8, scope.collectionIDs || [], { useSemantic: Boolean(scope.useSemantic) });
      case "search_web": return this.searchWeb(args.query, args.limit || 5);
      case "search_arxiv": return this.searchArxiv(args.query, args.limit || 5);
      case "search_github_code": return this.searchGitHubCode(args.query, args.limit || 5);
      default: throw new Error(`Unknown agent tool: ${name}`);
    }
  },

  async request(method, url, options = {}) {
    const response = await Zotero.HTTP.request(method, url, {
      headers: options.headers || {},
      body: options.body,
      responseType: options.responseType || "text",
      timeout: 30000
    });
    return response.responseText || response.response || "";
  },

  async searchWeb(query, limit) {
    const braveKey = Zotero.Prefs.get("extensions.researchAgent.braveAPIKey", true);
    if (braveKey) {
      const raw = await this.request("GET", `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`, {
        headers: { Accept: "application/json", "X-Subscription-Token": braveKey }
      });
      const data = JSON.parse(raw);
      return (data.web?.results || []).slice(0, limit).map((item) => ({ title: item.title, url: item.url, snippet: item.description }));
    }
    const html = await this.request("GET", `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    const doc = new DOMParser().parseFromString(html, "text/html");
    return [...doc.querySelectorAll(".result")].slice(0, limit).map((result) => {
      const link = result.querySelector(".result__a");
      return { title: link?.textContent?.trim(), url: link?.href, snippet: result.querySelector(".result__snippet")?.textContent?.trim() };
    }).filter((item) => item.url);
  },

  async searchArxiv(query, limit) {
    const searchQuery = `all:${query.replace(/\s+/g, "+AND+all:")}`;
    const xml = await this.request("GET", `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=0&max_results=${limit}&sortBy=relevance&sortOrder=descending`);
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return [...doc.querySelectorAll("entry")].map((entry) => ({
      title: entry.querySelector("title")?.textContent?.replace(/\s+/g, " ").trim(),
      url: entry.querySelector("id")?.textContent?.trim(),
      published: entry.querySelector("published")?.textContent?.slice(0, 10),
      summary: entry.querySelector("summary")?.textContent?.replace(/\s+/g, " ").trim(),
      authors: [...entry.querySelectorAll("author > name")].map((node) => node.textContent)
    }));
  },

  async searchGitHubCode(query, limit) {
    const token = Zotero.Prefs.get("extensions.researchAgent.githubToken", true);
    const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const raw = await this.request("GET", `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=${limit}`, { headers });
    const data = JSON.parse(raw);
    return (data.items || []).map((item) => ({
      repository: item.repository?.full_name,
      path: item.path,
      url: item.html_url,
      sha: item.sha
    }));
  }
};
