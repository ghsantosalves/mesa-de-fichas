# Cordatril

[Português](README.md) · **English**

*Cordatril* = **cordel** + **atril** (Portuguese for *lectern*). *Cordel* is Brazilian popular literature: booklets hung on a string at street markets. Here, reading cards lie open on a table and are tied together by threads, to tell the story of a piece of research.

An app to visually organize academic reading cards, like paper index cards spread on a table: drag them, group them into areas, link texts to each other and write notes about those links. The cards come from your **Zotero**: they are notes tagged `ficha`, written in a fixed format (produced by the Claude skills included in this project, in English or Portuguese).

**Open:** https://ghsantosalves.github.io/mesa-de-fichas/

- It is a website: nothing to install besides Zotero. The first time, you connect your Zotero account with a read-only key.
- It **only reads** Zotero; it never changes anything there.
- Your Zotero user ID and key, and the table layout, stay in your browser only.
- The interface is available in Portuguese and English (**Menu → English / Português**). It starts in the language of your browser.
- Optional Zotero plugin: **Tools → Open Cordatril**.

The full step-by-step guide (Zotero key, plugin, Claude skills) is in **[docs/TUTORIAL.en.md](docs/TUTORIAL.en.md)**.

## What is in here

| Folder/file | What it is for |
| --- | --- |
| `src/` | App code (React + TypeScript + React Flow). Texts in both languages are in `src/i18n.ts`. |
| `zotero-plugin/` | Zotero plugin that opens the website from the Tools menu. |
| `skill/reading-card/` · `skill/ficha-academica/` | Claude skill that writes cards in the format the app reads (English · Portuguese). |
| `skill/text-relations/` · `skill/relacoes-entre-textos/` | Claude skill that suggests relations between the project's texts, to import into Cordatril (English · Portuguese). |
| `docs/TUTORIAL.en.md` | Setup and usage guide. |
| `.github/workflows/site.yml` | Publishes the website and plugin to GitHub Pages on every push. |
| `.env.example` | Template for `.env.local`, to run locally with `npm run dev`. |
| `CLAUDE.md` | Project specification, used by Claude Code during development. |

## License

[MIT](LICENSE): you may use, copy, modify and redistribute it, including the skills and the plugin, as long as you keep the copyright notice.
