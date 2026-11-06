---
name: reading-card
description: Writes short academic reading cards (reference, thesis, concepts, to remember, dialogues, use, video, link) in the format read by Cordatril, ready to paste as a note in Zotero with the tag "ficha". Use when the user asks for a "reading card", "short card", "academic card", "/reading-card" or cards to organize on the table/Zotero, from a text (PDF, chapter, article) or from existing reading notes. Also use when they ask for cards for several texts at once. English version of the ficha-academica skill.
---

# Reading card (short version)

A card is a retrieval index: at a glance, the researcher should remember what the text is about, where each point is, whom it talks to and what it is for in their work. Details belong in full reading notes, if there are any.

The format is fixed because the cards are read by Cordatril, which turns them into cards on a visual table. Do not change labels, order or separators. The purpose (course, exam, project) does not go on the card: it comes from the Zotero collection the item is in.

## Input
1. **Existing full reading notes** (preferred): extract from them, without rereading the original text. Do not create new content; everything comes from the notes, with the pages they already give.
2. **A text** (PDF, chapter, article): read the whole excerpt, identify the thesis, concepts (in the author's sense), central idea and interlocutors, always with pages, and deliver only the card.
3. **Several texts or notes**: one card for each, in the order received.

## Format (exactly like this)

```
CARD · Author (year), Title, excerpt
Ref.: full reference, chapter/pages covered

Thesis: 1 to 2 sentences. [p. X]

Concepts: concept [p. X] · concept [p. X] · concept [p. X]

To remember: one sentence, paraphrased.

Dialogues: Author (relation) · Author (relation)

Use: theory · methodology
Video: link or "—"
Full notes: link or "—"
```

- The first line starts with `CARD · ` and the author's name comes before the first `)`, as `Author (year)`; the rest is title and excerpt.
- `Concepts`, `Dialogues` and `Use` are separated by ` · ` (space, middle dot, space).
- `—` means an empty field.
- Keep these English labels exactly; Cordatril also reads the Portuguese ones (`FICHA ·`, `Tese:`…), but do not mix languages within one card.

## How to fill each field
- **Ref.**: full reference in the style the user uses (ABNT, APA, Chicago…; if unknown, Chicago), with the chapter or pages covered by the card.
- **Thesis**: the central argument in 1 to 2 sentences, with page.
- **Concepts**: 3 to 5, the ones that most support the argument, each with the page where it appears.
- **To remember**: one sentence summing up the idea to memorize. Paraphrase, never a direct quotation.
- **Dialogues**: 2 to 4 authors or schools the text talks to, with the relation in one of these words: builds on, critiques, extends, mentions, object.
- **Use**: the role the text can play in the user's work, one or more of: theory, methodology, bibliography, argument, case study, context, source. If the user names another use, use theirs. If it cannot be inferred safely, propose one and flag it in the final line for them to confirm.
- **Video**: link to a lecture video about the text, only if the user provides it. Never search for or invent a link; with no link, "—".
- **Full notes**: link to the full reading notes, if the user provides it; otherwise "—".

## Rules
- Every statement has a page; uncertain page = [p. ?]. Never invent a page.
- Length: 80 to 120 words per card, not counting links.
- No direct quotations on the card.
- Never attribute to the author a dialogue that the text (or the notes) does not record.
- Concepts in the author's sense, not the everyday sense.
- Write the card in the language of the text or of the user's request; the labels stay in English.
- Deliver in the reply, each card in its own text block, ready to paste as a Zotero note with the tag `ficha` (the tag is always `ficha`, in any language). No document, no extra comments beyond at most one final line (e.g. pages left as [p. ?], use to confirm).

## Example

```
CARD · Koselleck (2004), Futures Past, "Space of Experience" and "Horizon of Expectation"
Ref.: KOSELLECK, Reinhart. Futures Past: On the Semantics of Historical Time. New York: Columbia University Press, 2004. [p. ?]

Thesis: Historical time arises from the tension between experience and expectation; in modernity, the gap between them widens. [p. ?]

Concepts: space of experience [p. ?] · horizon of expectation [p. ?] · historical time [p. ?]

To remember: Modernity is when the future stops repeating the past.

Dialogues: historia magistra vitae (object)

Use: theory
Video: —
Full notes: —
```
