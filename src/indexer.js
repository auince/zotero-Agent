/* global OS, PathUtils, Zotero, ZoteroPane */

var ResearchAgentIndexer = {
  async indexCurrentCollection() {
    const pane = Zotero.getActiveZoteroPane();
    const collection = pane.getSelectedCollection();
    if (!collection) throw new Error("Select a regular Zotero collection first.");
    const index = await ResearchAgentStorage.getIndex();
    const collectionNodes = [collection, ...collection.getDescendents(false, "collection").map((node) => Zotero.Collections.get(node.id))];
    let indexedArticles = 0;
    let indexedChunks = 0;

    for (const current of collectionNodes) {
      const path = this.collectionPath(current);
      index.collections[current.id] = { id: current.id, name: current.name, path, parentID: current.parentID || null };
      for (const item of current.getChildItems(false)) {
        if (!item.isRegularItem()) continue;
        const article = await this.articleRecord(item, current, path);
        index.articles[item.key] = article;
        index.chunks = index.chunks.filter((chunk) => chunk.articleKey !== item.key || chunk.collectionID !== current.id);
        const chunks = this.chunkArticle(article);
        index.chunks.push(...chunks);
        indexedArticles++;
        indexedChunks += chunks.length;
      }
    }
    await ResearchAgentStorage.saveIndex(index);
    return `Indexed ${indexedArticles} articles and ${indexedChunks} chunks under “${collection.name}”.`;
  },

  collectionPath(collection) {
    const names = [collection.name];
    let cursor = collection;
    while (cursor.parentID) {
      cursor = Zotero.Collections.get(cursor.parentID);
      if (!cursor) break;
      names.unshift(cursor.name);
    }
    return names;
  },

  async articleRecord(item, collection, collectionPath) {
    const attachment = this.bestTextAttachment(item);
    const fullText = attachment ? await this.readAttachmentText(attachment) : "";
    return {
      key: item.key,
      itemID: item.id,
      libraryID: item.libraryID,
      collectionID: collection.id,
      collectionPath,
      title: item.getField("title") || "Untitled",
      abstract: item.getField("abstractNote") || "",
      creators: item.getCreators().map((creator) => `${creator.firstName || ""} ${creator.lastName || ""}`.trim()).filter(Boolean),
      date: item.getField("date") || "",
      doi: item.getField("DOI") || "",
      url: item.getField("url") || "",
      attachmentKey: attachment?.key || null,
      text: fullText,
      indexedAt: new Date().toISOString()
    };
  },

  bestTextAttachment(item) {
    return item.getAttachments()
      .map((id) => Zotero.Items.get(id))
      .find((attachment) => attachment?.isAttachment() && attachment.attachmentContentType === "application/pdf");
  },

  async readAttachmentText(attachment) {
    try {
      const cachePath = Zotero.Fulltext.getItemCacheFile(attachment).path;
      if (await OS.File.exists(cachePath)) return await Zotero.File.getContentsAsync(cachePath);
    } catch (error) {
      Zotero.debug(`Research Agent could not read indexed text for ${attachment.key}: ${error}`);
    }
    return "";
  },

  chunkArticle(article) {
    const chunks = [];
    const intro = [article.title, article.abstract].filter(Boolean).join("\n\n");
    if (intro) chunks.push(this.makeChunk(article, "metadata", 0, intro));
    const paragraphs = article.text
      .replace(/\r/g, "")
      .split(/\n\s*\n+/)
      .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
      .filter((paragraph) => paragraph.length > 40);
    const maxChars = Zotero.Prefs.get("extensions.researchAgent.maxChunkChars") || 1400;
    let sequence = 1;
    for (const paragraph of paragraphs) {
      for (const text of this.splitLongParagraph(paragraph, maxChars)) {
        chunks.push(this.makeChunk(article, "paragraph", sequence++, text));
      }
    }
    return chunks;
  },

  splitLongParagraph(paragraph, maxChars) {
    if (paragraph.length <= maxChars) return [paragraph];
    const sentences = paragraph.match(/[^.!?。！？]+[.!?。！？]*/g) || [paragraph];
    const result = [];
    let current = "";
    for (const sentence of sentences) {
      if (current && current.length + sentence.length > maxChars) {
        result.push(current.trim());
        current = "";
      }
      current += sentence;
    }
    if (current.trim()) result.push(current.trim());
    return result;
  },

  makeChunk(article, level, sequence, text) {
    return {
      id: `${article.key}:${level}:${sequence}`,
      articleKey: article.key,
      collectionID: article.collectionID,
      collectionPath: article.collectionPath,
      title: article.title,
      level,
      sequence,
      text
    };
  },

  async search(query, limit = 8) {
    const index = await ResearchAgentStorage.getIndex();
    const terms = this.tokens(query);
    const scored = index.chunks.map((chunk) => ({ chunk, score: this.score(chunk, terms) })).filter(({ score }) => score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ chunk, score }) => ({
      score,
      citation: `${chunk.title} [${chunk.articleKey}] · ${chunk.collectionPath.join(" / ")} · ${chunk.level} ${chunk.sequence}`,
      text: chunk.text
    }));
  },

  tokens(text) {
    return [...new Set((text.toLowerCase().match(/[\\p{L}\\p{N}_-]{2,}/gu) || []))];
  },

  score(chunk, terms) {
    const haystack = `${chunk.title} ${chunk.text}`.toLowerCase();
    return terms.reduce((total, term) => total + (haystack.includes(term) ? (chunk.title.toLowerCase().includes(term) ? 4 : 1) : 0), 0);
  }
};
