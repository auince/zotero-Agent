# Research Agent for Zotero

A Zotero 9 plugin MVP that turns the currently selected collection into a local, hierarchical knowledge base and uses DeepSeek as a tool-using research agent.

## What is implemented

- **Three-level local index:** collection path → article metadata → paragraph chunks from Zotero's already-indexed PDF text cache.
- **Hierarchical retrieval:** lexical search returns evidence with collection path, item key, chunk level, and paragraph number. Article metadata is retained as a separate `metadata` chunk.
- **DeepSeek agent:** uses OpenAI-compatible DeepSeek tool calls to choose among local knowledge-base retrieval, web search, arXiv search, and GitHub source-code search.
- **Local research memory:** each user/agent exchange is retained in a local JSONL log; once per day (or on demand), it becomes a compact Markdown note with a representative title, questions, insights, and cited Zotero papers.
- **Privacy boundary:** the index, conversation log, and Markdown notes are in `<Zotero data directory>/research-agent/`. API keys are Zotero profile preferences, not files in this repository. Only text sent to the chosen external tool or DeepSeek leaves the computer.

## Install the prototype

1. Use the included `research-agent-0.1.0.xpi` (or create it with the packaging command below).
2. Zotero → **Tools → Add-ons** → gear icon → **Install Add-on From File…**.
3. Restart Zotero and open **Tools → Research Agent**.
4. Go to Zotero **Settings → Research Agent** and set your DeepSeek API key. GitHub and Brave Search keys are optional.
5. Select a collection, choose **Index selected collection**, then ask a question.

## External tools

| Tool | Default implementation | Credential |
|---|---|---|
| Knowledge base | Local lexical retrieval over the collection/article/paragraph index | none |
| DeepSeek agent | `https://api.deepseek.com/chat/completions` | required |
| Web | DuckDuckGo HTML fallback; Brave Search when configured | Brave optional |
| arXiv | arXiv Atom API | none |
| GitHub code | GitHub Code Search REST API | token strongly recommended |

## Package and verify

```sh
node --check bootstrap.js
for file in src/*.js chrome/content/chat.js; do node --check "$file"; done
zip -X -r research-agent-0.1.0.xpi manifest.json bootstrap.js prefs.js prefs.xhtml chrome src LICENSE README.md
unzip -t research-agent-0.1.0.xpi
```

## Deliberate MVP limits

- Retrieval is lexical, deterministic, and local. The next technical increment is a pluggable embedding backend plus SQLite/FAISS-style vector index and hybrid re-ranking.
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

The manifest targets Zotero 9.0.*. It follows Zotero's current bootstrapped-plugin structure: WebExtension-style `manifest.json`, `bootstrap.js`, lifecycle hooks, main-window hooks, and runtime chrome registration.
