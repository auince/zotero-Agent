/* Safe Markdown and local KaTeX rendering for Zotero's privileged document. */

var ResearchAgentMarkdown = {
  render(doc, target, source) {
    target.replaceChildren();
    this.append(doc, target, source);
  },

  append(doc, target, source) {
    const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
    let index = 0;
    while (index < lines.length) {
      if (!lines[index].trim()) { index++; continue; }
      if (/^\s*```/.test(lines[index])) { index = this.appendCodeBlock(doc, target, lines, index); continue; }
      if (this.isMathBlockStart(lines[index])) { index = this.appendMathBlock(doc, target, lines, index); continue; }
      const heading = lines[index].match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (heading) { const node = doc.createElement(`h${heading[1].length}`); this.appendInline(doc, node, heading[2]); target.append(node); index++; continue; }
      if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(lines[index])) { target.append(doc.createElement("hr")); index++; continue; }
      if (/^\s*>/.test(lines[index])) { index = this.appendQuote(doc, target, lines, index); continue; }
      if (/^\s*[-+*]\s+/.test(lines[index])) { index = this.appendList(doc, target, lines, index, false); continue; }
      if (/^\s*\d+[.)]\s+/.test(lines[index])) { index = this.appendList(doc, target, lines, index, true); continue; }
      if (this.isTableStart(lines, index)) { index = this.appendTable(doc, target, lines, index); continue; }
      index = this.appendParagraph(doc, target, lines, index);
    }
  },

  appendCodeBlock(doc, target, lines, index) {
    const opener = lines[index].match(/^\s*```([^\s]*)/);
    const code = doc.createElement("code");
    if (opener?.[1]) code.dataset.language = opener[1];
    const body = []; index++;
    while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) body.push(lines[index++]);
    code.textContent = body.join("\n");
    const pre = doc.createElement("pre"); pre.append(code); target.append(pre);
    return index < lines.length ? index + 1 : index;
  },

  isMathBlockStart(line) {
    return /^\s*(?:\$\$|\\\[)\s*$/.test(line)
      || /^\s*\$\$.+\$\$\s*$/.test(line)
      || /^\s*\\\[.+\\\]\s*$/.test(line);
  },

  appendMathBlock(doc, target, lines, index) {
    const first = lines[index].trim();
    const inlineDollar = first.match(/^\$\$(.+)\$\$$/);
    const inlineBracket = first.match(/^\\\[(.+)\\\]$/);
    if (inlineDollar || inlineBracket) {
      this.appendMath(doc, target, (inlineDollar || inlineBracket)[1], true);
      return index + 1;
    }
    const closing = first === "$$" ? "$$" : "\\]";
    const body = []; index++;
    while (index < lines.length && lines[index].trim() !== closing) body.push(lines[index++]);
    this.appendMath(doc, target, body.join("\n"), true);
    return index < lines.length ? index + 1 : index;
  },

  appendMath(doc, target, tex, displayMode) {
    const node = doc.createElement(displayMode ? "div" : "span");
    node.className = `research-agent-math${displayMode ? " is-display" : ""}`;
    const fallback = displayMode ? `\\[\n${tex}\n\\]` : `$${tex}$`;
    try {
      if (typeof katex === "undefined" || !katex.renderToString) throw new Error("KaTeX is unavailable");
      const markup = katex.renderToString(tex, { displayMode, throwOnError: false, strict: "ignore", trust: false });
      const range = doc.createRange(); range.selectNodeContents(node);
      node.append(range.createContextualFragment(markup));
    } catch (error) {
      node.classList.add("has-error"); node.textContent = fallback;
    }
    target.append(node);
  },

  appendQuote(doc, target, lines, index) {
    const body = [];
    while (index < lines.length && /^\s*>/.test(lines[index])) body.push(lines[index++].replace(/^\s*>\s?/, ""));
    const quote = doc.createElement("blockquote");
    const paragraph = doc.createElement("p");
    body.forEach((line, lineIndex) => { if (lineIndex) paragraph.append(doc.createElement("br")); this.appendInline(doc, paragraph, line); });
    quote.append(paragraph); target.append(quote); return index;
  },

  appendList(doc, target, lines, index, ordered) {
    const list = doc.createElement(ordered ? "ol" : "ul");
    const expression = ordered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-+*]\s+(.+)$/;
    while (index < lines.length) {
      const item = lines[index].match(expression);
      if (!item) break;
      const node = doc.createElement("li");
      const task = item[1].match(/^\[([ xX])\]\s+(.*)$/);
      if (task) { const checkbox = doc.createElement("input"); checkbox.type = "checkbox"; checkbox.disabled = true; checkbox.checked = task[1].toLowerCase() === "x"; node.append(checkbox, doc.createTextNode(" ")); this.appendInline(doc, node, task[2]); }
      else this.appendInline(doc, node, item[1]);
      list.append(node); index++;
    }
    target.append(list); return index;
  },

  isTableStart(lines, index) {
    return Boolean(lines[index]?.includes("|") && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] || ""));
  },

  tableCells(line) { return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()); },

  appendTable(doc, target, lines, index) {
    const table = doc.createElement("table"); const head = doc.createElement("thead"); const headerRow = doc.createElement("tr");
    for (const cell of this.tableCells(lines[index])) { const node = doc.createElement("th"); this.appendInline(doc, node, cell); headerRow.append(node); }
    head.append(headerRow); table.append(head); index += 2;
    const body = doc.createElement("tbody");
    while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
      const row = doc.createElement("tr");
      for (const cell of this.tableCells(lines[index])) { const node = doc.createElement("td"); this.appendInline(doc, node, cell); row.append(node); }
      body.append(row); index++;
    }
    table.append(body); target.append(table); return index;
  },

  appendParagraph(doc, target, lines, index) {
    const body = [];
    while (index < lines.length && lines[index].trim()) {
      if (body.length && (/^\s*```/.test(lines[index]) || this.isMathBlockStart(lines[index]) || /^\s*>/.test(lines[index]) || /^\s*[-+*]\s+/.test(lines[index]) || /^\s*\d+[.)]\s+/.test(lines[index]) || this.isTableStart(lines, index))) break;
      body.push(lines[index++]);
    }
    const paragraph = doc.createElement("p");
    body.forEach((line, lineIndex) => { if (lineIndex) paragraph.append(doc.createElement("br")); this.appendInline(doc, paragraph, line); });
    target.append(paragraph); return index;
  },

  appendInline(doc, target, text) {
    const token = /(`[^`]*`|\\\([^\n]*?\\\)|\$[^$\n]+\$|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\[[^\]]+\]\((?:https?:\/\/)[^\s)]+\)|https?:\/\/[^\s<]+)/g;
    let cursor = 0;
    for (const match of String(text).matchAll(token)) {
      if (match.index > cursor) target.append(doc.createTextNode(text.slice(cursor, match.index)));
      const value = match[0];
      if (value.startsWith("`")) { const code = doc.createElement("code"); code.textContent = value.slice(1, -1); target.append(code); }
      else if (value.startsWith("\\(")) this.appendMath(doc, target, value.slice(2, -2), false);
      else if (value.startsWith("$")) this.appendMath(doc, target, value.slice(1, -1), false);
      else if (value.startsWith("**") || value.startsWith("__")) { const strong = doc.createElement("strong"); this.appendInline(doc, strong, value.slice(2, -2)); target.append(strong); }
      else if (value.startsWith("~~")) { const deleted = doc.createElement("del"); this.appendInline(doc, deleted, value.slice(2, -2)); target.append(deleted); }
      else if (value.startsWith("[")) { const parts = value.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/); if (parts) this.appendLink(doc, target, parts[1], parts[2]); else target.append(doc.createTextNode(value)); }
      else this.appendLink(doc, target, value, value);
      cursor = match.index + value.length;
    }
    if (cursor < text.length) target.append(doc.createTextNode(text.slice(cursor)));
  },

  appendLink(doc, target, label, url) {
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("Unsupported URL protocol");
      const link = doc.createElement("a"); link.href = parsed.href; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = label; target.append(link);
    } catch (_) { target.append(doc.createTextNode(label)); }
  },

  takeCompleteBlocks(source) {
    const text = String(source || "").replace(/\r\n?/g, "\n");
    let fence = false; let mathClosing = null; let safeEnd = 0; let offset = 0;
    for (const line of text.split(/(?<=\n)/)) {
      const trimmed = line.trim();
      if (/^\s*```/.test(line)) fence = !fence;
      const openedMath = !fence && !mathClosing && (trimmed === "$$" || trimmed === "\\[");
      if (openedMath) mathClosing = trimmed === "$$" ? "$$" : "\\]";
      offset += line.length;
      if (!fence && !openedMath && mathClosing && trimmed === mathClosing) { mathClosing = null; safeEnd = offset; }
      if (!fence && !mathClosing && /^\s*\n$/.test(line)) safeEnd = offset;
    }
    return { complete: text.slice(0, safeEnd), remaining: text.slice(safeEnd) };
  },

  createStreamRenderer(doc, target) {
    let buffer = ""; let pending = null;
    const showPending = () => {
      if (!buffer) { pending?.remove(); pending = null; return; }
      pending ||= doc.createElement("div"); pending.className = "research-agent-markdown-pending"; pending.textContent = buffer;
      if (!pending.parentNode) target.append(pending);
    };
    const flushComplete = () => {
      const parts = this.takeCompleteBlocks(buffer);
      if (parts.complete) { pending?.remove(); pending = null; this.append(doc, target, parts.complete); buffer = parts.remaining; }
      showPending();
    };
    return {
      append: (text) => { buffer += String(text || ""); flushComplete(); },
      finish: () => { pending?.remove(); pending = null; if (buffer) this.append(doc, target, buffer); buffer = ""; },
      pendingText: () => buffer
    };
  }
};
