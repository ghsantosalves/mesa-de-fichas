# Cordatril tutorial

[Português](TUTORIAL.md) · **English**

This guide is for non-programmers. Follow it in order; each step says what you should see. You don't need to install anything besides Zotero: Cordatril is a website.

**Website:** https://ghsantosalves.github.io/mesa-de-fichas/

To see the interface in English, open **Menu → English (idioma)**. It switches back with **Menu → Português (language)**. On the first visit it follows your browser's language.

1. [How it works](#how-it-works)
2. [Create the Zotero key](#1-create-the-zotero-key)
3. [Install the button in Zotero](#2-install-the-button-in-zotero)
4. [Open the table and connect](#3-open-the-table-and-connect)
5. [Install the Claude skills](#4-install-the-claude-skills)
6. [Create cards and put them in Zotero](#5-create-cards-and-put-them-in-zotero)
7. [Using the table](#using-the-table)
8. [Suggest relations with Claude](#suggest-relations-with-claude)
9. [New and removed cards](#new-and-removed-cards)
10. [Where your data lives](#where-your-data-lives)
11. [Common problems](#common-problems)
12. [For developers](#for-developers)

## How it works

```
text you read ──► Claude (reading-card skill) ──► Zotero note tagged "ficha" ──► Cordatril
```

1. You read a text and ask Claude for a short card, using the skill included in this project.
2. You paste the card as a **child note** of the item in Zotero and add the tag `ficha`.
3. Cordatril fetches those notes from Zotero and shows each one as a card on a table where you drag, group into areas and link texts to each other.

Card contents live in Zotero (to fix a card, edit the note there). The table layout (positions, colors, areas, links, notes, drawings) lives in your browser. Cordatril reads Zotero and never changes or deletes anything there; the only write is optional, when you create a new card with the **New card** button.

You need a **Zotero** account with your library synced to the cloud (in Zotero: Edit → Settings → Sync).

## 1. Create the Zotero key

The key is what lets Cordatril read your notes.

1. Go to https://www.zotero.org/settings/keys (signed in).
2. Write down the number in **"Your user ID for use in API calls is …"**.
3. Click **Create new private key** and check **only**:
   - Personal Library → **Allow library access**
   - Personal Library → **Allow notes access**
   - **Allow write access**: leave it unchecked if you want the app to only read. Check it if you want to use the **New card** button to create cards from the app and have the **table backup in Zotero** (see [Create a card from the app](#create-a-card-from-the-app)).
   - Default Group Permissions → **None**.
4. Give it a name (e.g. "Cordatril"), click **Save Key** and copy the key shown. Keep it somewhere safe: Zotero shows it only once.

A read-only key means that even if it leaks, nobody can change your library. A key with write access is handier (creates cards from the app), but keep it safer: if it leaks, whoever has it can change your library. To switch keys, use **Menu → Disconnect from Zotero** and connect again.

## 2. Install the button in Zotero

The plugin adds **Open Cordatril** to Zotero's **Tools** menu (and to the right-click menu of items). It only opens the website; it does not read or change anything in your library.

1. Download the plugin: https://ghsantosalves.github.io/mesa-de-fichas/mesa-de-fichas.xpi (if the browser asks, choose to save the file).
2. In Zotero, open **Tools → Plugins**.
3. Click the gear ⚙ at the top of the window → **Install Plugin From File…** and choose the downloaded `mesa-de-fichas.xpi`.
4. Close the plugins window. **Tools** should now show **Open Cordatril**.

Without the plugin, Cordatril works the same: just open the website in your browser (worth bookmarking).

## 3. Open the table and connect

1. In Zotero, **Tools → Open Cordatril** (or open the website in your browser).
2. The first time, you see **Connect to your Zotero**. Paste the user ID and the key from step 1 and click **Connect**.
3. The website checks the key with Zotero. If all is well, your cards appear, arranged in columns.

Next time, the website opens straight on the table, just as you left it.

## 4. Install the Claude skills

The project includes two Claude *skills* (instructions that teach Claude to do a task the same way every time):

| Skill | What it does | English | Portuguese |
| --- | --- | --- | --- |
| Cards | Writes cards exactly in the format Cordatril reads. | [reading-card.zip](https://ghsantosalves.github.io/mesa-de-fichas/reading-card.zip) | [ficha-academica.zip](https://ghsantosalves.github.io/mesa-de-fichas/ficha-academica.zip) |
| Relations | Suggests relations between the texts of your project, to import into Cordatril (see [Suggest relations with Claude](#suggest-relations-with-claude)). | [text-relations.zip](https://ghsantosalves.github.io/mesa-de-fichas/text-relations.zip) | [relacoes-entre-textos.zip](https://ghsantosalves.github.io/mesa-de-fichas/relacoes-entre-textos.zip) |

Each skill comes in two versions that do the same thing. The English one writes cards with English labels (`CARD ·`, `Thesis:`…); the Portuguese one with Portuguese labels (`FICHA ·`, `Tese:`…). Cordatril reads both. Install the one for the language you work in (or both).

**In Claude (website or app):** download the `.zip`, open **Settings → Capabilities** (or **Skills**) and upload the file. Don't unzip it.

**In Claude Code:** unzip it and copy the folder (e.g. `text-relations`) to `~/.claude/skills/` (on Windows, `C:\Users\<your user>\.claude\skills\`).

## 5. Create cards and put them in Zotero

1. In Claude, send the text (PDF, chapter) or reading notes you already have and ask: **"make the reading card for this text"**.
2. Claude returns a block starting with `CARD ·`. Check it, especially the pages: `[p. ?]` means a page to check.
3. In Zotero, right-click the text's item → **Add Note** (child note, attached to the item).
4. Paste the card into the note.
5. Add the tag **`ficha`** to the note (exactly like that, lowercase).
6. Put the **item** (not the note) in any collections you want. In Cordatril, collections work as filters: e.g. one collection per course or per thesis chapter.
7. Wait for Zotero to sync. When you return to the Cordatril tab, it checks for updates by itself.

The format, for anyone who wants to write cards by hand. Labels can be in Portuguese or in English:

```
CARD · Author (year), Title, excerpt
Ref.: full reference, chapter/pages covered

Thesis: 1 to 2 sentences. [p. X]

Concepts: concept [p. X] · concept [p. X]

To remember: one sentence.

Dialogues: Author (relation) · Author (relation)

Use: theory · methodology
Video: link or "—"
Full notes: link or "—"
```

| English | Portuguese |
| --- | --- |
| `CARD ·` | `FICHA ·` |
| `Ref.:` or `Reference:` | `Ref.:` |
| `Thesis:` | `Tese:` |
| `Concepts:` | `Conceitos:` |
| `To remember:` | `Para lembrar:` |
| `Dialogues:` | `Diálogos:` |
| `Use:` | `Uso:` |
| `Video:` | `Vídeo:` |
| `Full notes:` | `Fichamento completo:` |

The tag is always `ficha`. Notes tagged `ficha` that don't follow the format don't disappear: they show up under **Cards with problems**, with the reason.

## Create a card from the app

The **New card** button, in the top bar, builds a card from a text already in Zotero:

1. Choose the **collection** and the **text** (search by author, title or year; in "All collections", type at least 2 letters). Texts that already have a card are marked.
2. What Zotero knows about the text is filled in: **Author (year), title** and the **reference** (built from publisher, place, journal, volume, pages…). Check it and add the chapter or pages.
3. Fill in **Thesis** (required), **Concepts**, **To remember**, **Dialogues** (in Concepts, type a concept and click **Add** or press **Enter**; in Dialogues, type the **author** and the **relation** — free text, with suggestions — and click **Add**; the app adds the " · " itself), tick the **Use in the project** and, if any, the video and full-notes links. Below, the note appears exactly as it will be saved.
4. **Save to Zotero** creates the note on the text, tagged `ficha`; it shows up in the **New cards** strip a moment later. This only works with a key with **Allow write access**. With a read-only key, use **Copy text** and paste it as a note on the text in Zotero (the **Open the text in Zotero** button takes you there), tagged `ficha`.

The app never changes or deletes existing notes: to fix a card, edit the note in Zotero.

## Using the table

Everything is in the **left sidebar**, top to bottom: **View** (collection, search, **Table** or **List**, **New card**) · **Table tools** (**New area**, **Collapse all**, **Map**, **Link cards**, **Draw**, **Notes visible**) · **Zoom** (− + and **Fit all**) · and the **Zotero**, **Table** and **Appearance** groups. The button at the top of the sidebar collapses it into a strip of icons (the name appears on hover; the collection and search icons open the sidebar right on that field). On a phone, or in a narrow window, the sidebar becomes a **drawer**: tap ☰ in the corner to open it; it closes by itself when you pick an action, tap outside or press Esc.

- **Move:** drag a card; drag the background (or scroll) to move around the table.
- **Zoom:** Ctrl + mouse wheel, pinch on a touchpad, or the − and + buttons. **Fit all** frames all cards. **Double-click** a card or a link box to zoom to it.
- **Collection:** the bar menu shows only the cards in one collection (and its subcollections).
- **Search:** the "Highlight concept, author…" field dims the cards that don't contain the typed text, in any field, ignoring accents and case.
- **Pages:** in the cards, page numbers in brackets, like "[p. 66-77]", are clickable: they open the text's PDF in Zotero at that page. Zotero opens by position in the PDF; for chapters and articles, the app uses the text's **Pages** field in Zotero (e.g. "65-119") or, if it is empty, the range in the card's **Ref.** line (e.g. "ch. 2, p. 65-119"), assuming a PDF of just that excerpt: so "[p. 66]" opens the 2nd sheet. Since every scan is different (extra chapters, a cover, two pages per sheet), this guess can be wrong. If a link opens in the wrong place, open the card's **⋯** menu, under **PDF pages**, and say where one page is: e.g. "printed page 51 is on PDF sheet 4" (tick "two printed pages per sheet" for open-book scans). Do it once per card: all its links then open in the right place.
- **List:** shows the cards as text, to check how each note was read.
- **Collapse a card:** the ▾ button on the card. Collapsed, it shows only author and title. **Collapse all / Expand all** acts on the visible cards. Whenever a card or box changes size (expanding cards, opening the table, switching collection, showing notes), the table readjusts by itself: whatever is touching moves aside just enough so nothing overlaps, and the card that grew stays put.
- **Card color and fields:** the **⋯** button at the bottom of the card. Choose the border color and, under "Fields shown on this card", uncheck what you don't want to see on that card.
- **Areas:** **New area** creates a rectangle in the middle of the screen, with the title ready to type. Drag it by the title (or ⠿) to move it: the cards inside go along. Drag the bottom-right corner to resize. The × removes the area (asks for a second click); the cards stay on the table.
- **Link cards:** turn on **Link cards**, click the card the relation starts from, then the other one. An arrow appears with a box in the middle, and the link panel opens. Esc leaves link mode.
- **Link panel:** shows both cards (author, title, thesis). Write the **relation** (free text; the buttons suggest the ones already used) and the **note**. **Reverse direction**, **Re-center box** and **Remove link** (asks for a second click).
- **Link box:** click it to open the panel; drag it out of the way (the arrow bends to pass through it); drag its corner to resize. **Notes visible** shows or hides the notes in the boxes; when shown, they appear in full.
- **Relation colors and legend:** each kind of relation has a color ("builds on" green, "critiques" red, "dialogues with" purple, "extends" blue…). The legend, at the bottom right, lists the collection's relations and how many links each has. Click a relation to hide or show those arrows; **Show all** brings everything back.
- **Focus:** click a card (outside link mode) to put it in focus: only that card, its links and the texts linked to it stand out; the rest fades. Click another card to move the focus; click the background, **Exit focus** or press Esc to leave. With a card in focus, you can walk with the **arrow keys**: from the card, an arrow goes to the link box in that direction; from the box, an arrow always goes to a **text**, the one in that direction (the linked one, which becomes the focus and shows *its* links, or the card you came from). To reach a link that sits behind another, use **Shift + arrow** from a box: it moves to the neighboring box in that direction. **Enter** on a box opens the link.
- **Cutout (walking through the relations):** with a card in focus, press **Cutout** in the corner panel. The screen shows only that text, in the center, and the texts linked to it around it, with each link box in the middle of its arrow. Click a surrounding text to bring it to the center and see the texts linked to *it*: that way you walk from text to text. With the keyboard, the arrow keys move **in the direction pressed**: from the center text, **↓** goes to the link box below and, again, to the text below; **↑ ↑** goes back to the center (the same for ← → and sideways). The view follows the marked item; **Enter** brings the marked text to the center (or opens the marked link); **Backspace** or **← Back** returns to the previous text on the path. **Esc** or **Exit cutout** restores the table exactly as it was: the cutout is just a way of viewing and doesn't change the layout.
- **Map:** spreads the visible cards over the table, open or collapsed as they are, so that nothing sits on top of anything else: linked texts stay close, each link box sits between its two cards and each arrow goes through its own box, along its own path. Cards without links go in a grid below. The previous layout is kept: the **↶** button next to **Map** restores it. **Areas** follow their cards: the cards of an area stay together in the map, the area is redrawn around them and cards from outside are moved out of it (an empty area goes below everything). The ↶ arrow also puts areas back where they were.
- **Each collection has its own table:** the layout (positions and collapsed cards) and the links belong to the collection chosen in the bar. So links made for an exam don't show up in your thesis collection, and the same pair of texts can have different relations in each. A new collection starts with the "All collections" layout. Links made in "All collections" are **general** and appear in every collection. In the link panel, the **Collection** field changes where a link applies. Card color, hidden fields and highlights apply to every collection.
- **Draw (pencil button ✏):** opens a palette at the top of the table:
  - **Pen**: freehand strokes, in five colors and three thicknesses;
  - **Highlighter**: wide translucent strokes over cards or the table;
  - **Highlight text**: select a passage on a card and it is highlighted in the chosen color. Click a highlight to remove it;
  - **Eraser**: pass over a stroke to erase it;
  - **Undo** (or Ctrl+Z) and **✕** (or Esc) to stop drawing.

  Drawings follow the table when you pan and zoom, are saved and appear in the exported image. Nothing here changes Zotero.
- **Menu** (on the left), in three groups — **Zotero**, **Table** and **Appearance**: **Check Zotero for updates**, **Reload everything from Zotero**, **Theme…** (light, dark or system, with editable colors), **Export…** (PNG image, links summary in Markdown, cards for Claude), **Import links…**, **Save or open…** (a `.json` file with the whole layout), **Table backup in Zotero…** (see [Where your data lives](#where-your-data-lives)), **English / Português**, **Disconnect from Zotero…**.

## Suggest relations with Claude

With the `text-relations` skill (or `relacoes-entre-textos`, in Portuguese) installed (step 4):

1. In Cordatril, choose the collection and open **Menu → Export… → Cards for Claude → Download cards for Claude**. The file lists each card with an identifier, like `[ABCD1234]`, and the existing links.
2. In Claude, send that file along with your **project context** (topic, research question, goals, chapters) and ask: **"suggest the relations between these texts for Cordatril"**.
3. Claude answers with an overview, a readable list and a code block at the end.
4. In Cordatril, **Menu → Import links…**: paste the whole answer (or just the block). Check the ones you want and click **Place on the table**.

Imported links are just like the ones made by hand: you can edit, reverse, move or remove them.

## New and removed cards

- **New cards:** cards that arrive from Zotero after the first time appear in the **New cards** strip, at the bottom left. Drag each one where you want, click **Place** (it goes to an empty spot on screen) or **Place all**.
- **Removed cards:** if a card on the table disappears from Zotero (note deleted, in the trash or without the `ficha` tag), it stays on the table marked **Removed from Zotero**, showing its last known content. Its links **are not deleted**. If the note comes back, the card returns to normal. To get rid of it, click **Remove from table** (asks for a second click).
- **Sync:** Cordatril keeps a copy of what it has downloaded and afterwards asks Zotero only for what changed, so it opens quickly even with many cards.

## Where your data lives

- **Cards:** in Zotero. Cordatril reads them; it only writes when you create a new card with **New card**.
- **Zotero user ID and key:** only in your browser; sent only to Zotero (api.zotero.org).
- **Table layout:** saved automatically **in the browser** shortly after each change ("Table saved in this browser", in the corner). So:
  - clearing browsing data erases the browser's layout (cards stay safe in Zotero);
  - that is why there is the **table backup in Zotero**: with a key with **Allow write access**, the app keeps the whole layout in a note of its own in Zotero (title "Cordatril — table backup", tag `cordatril-mesa`; don't edit or delete that note). It updates by itself a few minutes after each change, and the corner notice shows the time of the last backup. Since Zotero syncs, the backup reaches your other computers: in a browser with no table, the app offers to **use the backup**. You can also save or restore at any time in **Menu → Table backup in Zotero**;
  - with a read-only key there is no Zotero backup: use **Menu → Save or open…** to save the table to a file (and open it on another computer). After two weeks without any backup, the corner notice reminds you.

## Common problems

- **"Zotero did not recognize the key"**: the key was copied partially or deleted. Create another one (step 1).
- **"This key belongs to user X, not Y"**: the user ID doesn't match the key; copy the number from the same page as the key.
- **"The key needs permission…"**: edit the key at zotero.org/settings/keys and check *Allow library access* and *Allow notes access*.
- **A new card doesn't show up:** check that Zotero synced, that the note has the `ficha` tag and that the collection chosen in the bar is the item's. Then use **Menu → Check Zotero for updates**.
- **"Open Cordatril" is missing in Zotero:** in Tools → Plugins, check that the plugin is enabled.

## For developers

1. Install [Node.js](https://nodejs.org) (LTS) and [Git](https://git-scm.com).
2. `git clone https://github.com/ghsantosalves/mesa-de-fichas.git`, enter the folder and run `npm install`.
3. Optional: copy `.env.example` to `.env.local` and fill in `ZOTERO_USER_ID` and `ZOTERO_API_KEY`. The key then stays in the local server and the app doesn't ask to connect.
4. `npm run dev` and open http://localhost:5173.

Interface texts are in `src/i18n.ts`, each one as a `[Portuguese, English]` pair. Every push to `main` publishes the website and the plugin (`.github/workflows/site.yml`).
