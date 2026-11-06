---
name: text-relations
description: Suggests relations between the texts of a research project from the cards exported by Cordatril (the "Cards for Claude" file) and the project context, and delivers the links in a block ready for "Import links" in Cordatril. Use when the user sends the cards-for-Claude file (fichas-para-o-claude), asks for "relations between the texts", "links for the table", "how these texts talk to each other", "connect the cards" or wants to know which readings of the project dialogue with each other. English version of the relacoes-entre-textos skill.
---

# Relations between texts (for Cordatril)

The goal is to help the researcher see how the project's readings talk to each other: who builds on whom, who critiques, who extends, who offers the concept that another text applies. Suggestions become arrows in Cordatril, where the researcher decides which ones stay. So each suggestion must be justifiable from the cards' content and useful for the project, not an exercise in free association.

## Input

1. **The "Cards for Claude" file**, exported by Cordatril (Export → Cards for Claude). Each card comes with an identifier in brackets, like `[ABCD1234]`, and the file also lists the links that already exist.
2. **The project context**: topic, research question, goals, hypotheses, chapters or axes, central concepts, sources. It may be pasted, in a document or already known from the conversation.

If the file is missing, ask the user to export it from Cordatril (do not make up identifiers). If the project context is missing, ask at most two short questions (topic and research question; axes or chapters). If they prefer to go on without it, work from the cards only and say so in one line.

## How to work

1. **Read the whole cards**: thesis, concepts (with pages), to remember, dialogues, use in the project, collections and area on the table. Cards may have Portuguese labels (Tese, Conceitos, Para lembrar, Diálogos, Uso…) or English ones.
2. **Look for links, in this order of strength:**
   - **Explicit dialogue**: a card's "Dialogues" field names the author of another card in the file (e.g. "Koselleck (builds on)" and there is a Koselleck card). This is the safest link; use the recorded relation.
   - **Shared or disputed concept**: the same concept, or neighboring ones, appear on different cards, in the same sense or in opposite senses.
   - **Theses that complement or oppose each other.**
   - **Role in the project**: one text provides the theoretical frame another applies to a case, or one text is a source/object that another helps to read. Use the project context to judge this.
3. **Choose the relation** in a few words, read as "A [relation] B". Prefer relations already used in the file's existing links and this vocabulary: *builds on, critiques, extends, dialogues with, contrasts with, complements, applies the concept of, grounds, is a case of, revisits*. Direction matters: in "Hartog builds on Koselleck", A = Hartog.
4. **Write the note** (1 to 3 sentences): the concrete point of contact (concept, thesis, page from the cards when available) and why this relation matters for the project (which chapter, argument or question it helps). If it is your hypothesis and not something the cards record, say "possibly" or "can be read as".
5. **Give the confidence**:
   - **high**: explicit dialogue on the cards or a clearly shared concept;
   - **medium**: clear thematic or theoretical proximity, but not recorded on the cards;
   - **low**: a reading hypothesis worth testing.

## Rules

- Use only identifiers that are in the file, exactly as they appear (8 letters/digits, without brackets in the JSON).
- Do not repeat links that already exist in the file (same pair of cards, in either direction).
- One link per pair of cards; never link a card to itself.
- Quality over quantity: usually between half and twice the number of cards, at most 40. If there are few good links, deliver few.
- Do not invent content, authors, dialogues or pages that are not on the cards. Pages only if the card gives them.
- Write relations and notes in the language the user writes in, with the authors' own terminology.

## Output (in this order)

1. **Overview** (3 to 6 lines): the axes or clusters you noticed among the texts and how they connect to the project.
2. **Readable list**, one line per link: `Author (year) → relation → Author (year) — note (confidence)`.
3. **The block to import**, exactly in this format (a single `json` code block). The keys and the "formato" value are fixed and stay in Portuguese, because Cordatril reads them; only the values of `rel`, `nota` and `confianca` are in the user's language:

```json
{
  "formato": "mesa-de-fichas-associacoes",
  "versao": 1,
  "associacoes": [
    {
      "a": "CARD_A_ID",
      "b": "CARD_B_ID",
      "rel": "builds on",
      "nota": "Point of contact and why it matters for the project.",
      "confianca": "high"
    }
  ]
}
```

4. One final line: **"In Cordatril: Menu → Import links, and paste this answer (or just the block above)."**

## Example (excerpt)

Cards in the file: `[I87FSM7X] Certeau (1988), The Writing of History, ch. 2` and `[HPMNEQ8B] Diehl (2008), Ideas of the future in the past…`; project about an educational program and its ideas of the future.

Readable list:
`Diehl (2008) → dialogues with → Certeau (1988) — Both treat the writing of history as a situated operation: Certeau through the social place [p. 66], Diehl through the crisis of progress [p. 53]; together they support reading the program's materials as the product of a place and of a horizon of the future. (medium)`

Block:

```json
{
  "formato": "mesa-de-fichas-associacoes",
  "versao": 1,
  "associacoes": [
    {
      "a": "HPMNEQ8B",
      "b": "I87FSM7X",
      "rel": "dialogues with",
      "nota": "Both treat the writing of history as a situated operation: Certeau through the social place [p. 66], Diehl through the crisis of progress [p. 53]; together they support reading the program's materials as the product of a place and of a horizon of the future.",
      "confianca": "medium"
    }
  ]
}
```
