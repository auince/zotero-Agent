# Research Agent for Zotero

A Zotero 9 plugin MVP that turns the currently selected collection into a local, hierarchical knowledge base and uses DeepSeek as a tool-using research agent.

## What is implemented

- **Three-level local index:** collection path → article metadata → paragraph chunks from Zotero's already-indexed PDF text cache.
- **Hybrid hierarchical retrieval:** SiliconFlow `BAAI/bge-m3` embeddings retrieve semantic candidates; `BAAI/bge-reranker-v2-m3` reranks them. Results retain collection path, item key, chunk level, and paragraph number. Article metadata is a separate `metadata` chunk.
- **Background knowledge-base management:** index the selected collection, selected Zotero articles, or every regular article in the active library. The manager lists local entries and can remove or re-embed selected entries without deleting Zotero items.
- **Non-blocking indexing:** a sequential background queue reports article-level progress, yields to Zotero between articles, records per-item failures, and can be cancelled. Disabling or uninstalling the plugin cancels the queue; the in-flight network request is allowed to finish safely.
- **DeepSeek agent:** streams its answer into the sidebar, shows provider-supplied reasoning and real-time tool activity, then collapses the trace and lists the retrieved Zotero papers and external sources.
- **Local research memory:** each user/agent exchange is retained in a local JSONL log; once per day (or on demand), it becomes a compact Markdown note with a representative title, questions, insights, and cited Zotero papers.
- **Privacy boundary:** the index, conversation log, and Markdown notes are in `<Zotero data directory>/research-agent/`. API keys are Zotero profile preferences, not files in this repository. Chunk text is sent to SiliconFlow during embedding and candidate text is sent during reranking; only the resulting vectors and local index are retained locally.

## Install the prototype

1. Use the included `research-agent-0.3.0.xpi` (or create it with the packaging command below).
2. Zotero → **Tools → Add-ons** → gear icon → **Install Add-on From File…**.
3. Restart Zotero. In an item's right-side details pane, open **Research Agent** (or click its side-navigation icon). The **Research Agent** settings tab is available in Zotero Settings.
4. Go to Zotero **Settings → Research Agent**, enter each service's API URL and key, fetch its model list from the provider, select models, and run the connection test. GitHub and Brave Search keys are optional.
5. Select a collection or articles, open the **Research Agent** right sidebar, choose the desired indexing action, then ask a question. Enable RAG only when you want to select and search an indexed knowledge base; otherwise the agent analyzes only the currently selected Zotero paper. The progress bar is non-modal, so Zotero remains usable while indexing.

## External tools

| Tool | Default implementation | Credential |
|---|---|---|
| Knowledge base | Local hierarchical lexical retrieval during chat; SiliconFlow `BAAI/bge-m3` embedding is used only while embedding or re-embedding knowledge-base entries | SiliconFlow required only for knowledge-base management |
| DeepSeek agent | `https://api.deepseek.com/chat/completions` | required |
| Web | DuckDuckGo HTML fallback; Brave Search when configured | Brave optional |
| arXiv | arXiv Atom API | none |
| GitHub code | GitHub Code Search REST API | token strongly recommended |

## Package and verify

```sh
node --check bootstrap.js
for file in src/*.js chrome/content/chat.js; do node --check "$file"; done
node tests/indexer-contract.test.js && node tests/semantic-contract.test.js && node tests/jobs-contract.test.js && node tests/agent-stream-contract.test.js && node tests/prefs-models-contract.test.js && node tests/memory-contract.test.js
zip -X -r research-agent-0.3.0.xpi manifest.json bootstrap.js prefs.js prefs.xhtml prefs-ui.js chrome src locale icons LICENSE README.md
unzip -t research-agent-0.3.0.xpi
```

## Deliberate MVP limits

- Vectors are stored alongside chunks in the local JSON index. This keeps the prototype dependency-free but is not the best format for very large libraries; the next increment is a SQLite/FAISS-style vector index and background incremental indexing.
- The plugin consumes Zotero's existing full-text cache. PDFs must already be indexed by Zotero; scanned PDFs need OCR first.
- The daily job runs while Zotero is open and catches up for the previous day at next launch. It cannot run while Zotero itself is closed.
- GitHub code search may reject unauthenticated requests; add a token in Settings when needed.
- This is a research prototype. Test on a copied Zotero profile before using it with an irreplaceable library.

## Repository publication

The repository is initialized locally with no remote and contains no secret. To publish after creating an empty GitHub repository under your account:

```sh
git remote add origin https://github.com/<your-account>/zotero-research-agent.git
git branch -M main
git push -u origin main
```

## Zotero compatibility

The manifest declares Zotero 7.9.9–10.9.9, matching the compatibility declaration used by the locally installed Zotero 9 translation plugin. Zotero 9 also requires an `update_url`; this prototype uses an inert placeholder until the GitHub Release update manifest is published. It follows Zotero's current bootstrapped-plugin structure: WebExtension-style `manifest.json`, `bootstrap.js`, lifecycle hooks, main-window hooks, and runtime chrome registration.
