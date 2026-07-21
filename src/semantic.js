/* global Zotero, atob */

var ResearchAgentSemantic = {
  async embed(texts) {
    const key = Zotero.Prefs.get("extensions.researchAgent.siliconFlowAPIKey", true);
    if (!key) throw new Error("Set a SiliconFlow API key before building the semantic index.");
    const response = await this.request("/embeddings", {
      model: Zotero.Prefs.get("extensions.researchAgent.embeddingModel", true) || "BAAI/bge-m3",
      input: texts,
      encoding_format: "base64"
    }, key);
    return response.data.sort((a, b) => a.index - b.index).map((entry) => entry.embedding);
  },

  async rerank(query, candidates, topN) {
    const key = Zotero.Prefs.get("extensions.researchAgent.siliconFlowAPIKey", true);
    if (!key) throw new Error("Set a SiliconFlow API key before reranking results.");
    const response = await this.request("/rerank", {
      model: Zotero.Prefs.get("extensions.researchAgent.rerankModel", true) || "BAAI/bge-reranker-v2-m3",
      query,
      documents: candidates.map((candidate) => `${candidate.chunk.title}\n${candidate.chunk.text}`),
      top_n: Math.min(topN, candidates.length),
      return_documents: false
    }, key);
    return response.results.map((result) => ({ ...candidates[result.index], rerankScore: result.relevance_score }));
  },

  async request(path, payload, key) {
    const baseURL = (Zotero.Prefs.get("extensions.researchAgent.siliconFlowBaseURL", true) || "https://api.siliconflow.cn/v1").replace(/\/$/, "");
    const response = await Zotero.HTTP.request("POST", `${baseURL}${path}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
      responseType: "text",
      timeout: 60000
    });
    const data = JSON.parse(response.responseText || response.response || "{}");
    if (data.error) throw new Error(`SiliconFlow: ${data.error.message || JSON.stringify(data.error)}`);
    return data;
  },

  cosine(base64A, base64B) {
    if (!base64A || !base64B) return 0;
    const a = this.decode(base64A);
    const b = this.decode(base64B);
    if (a.length !== b.length) return 0;
    let dot = 0;
    let aNorm = 0;
    let bNorm = 0;
    for (let index = 0; index < a.length; index++) {
      dot += a[index] * b[index];
      aNorm += a[index] ** 2;
      bNorm += b[index] ** 2;
    }
    return aNorm && bNorm ? dot / Math.sqrt(aNorm * bNorm) : 0;
  },

  decode(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return new Float32Array(bytes.buffer);
  }
};
