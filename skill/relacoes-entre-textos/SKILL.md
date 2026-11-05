---
name: relacoes-entre-textos
description: Sugere relações entre os textos de um projeto de pesquisa a partir das fichas exportadas pela Mesa de fichas (arquivo "Fichas para o Claude") e do contexto do projeto, e entrega as associações num bloco pronto para "Importar associações" na Mesa. Use quando o usuário enviar o arquivo fichas-para-o-claude, pedir "relações entre os textos", "associações para a mesa", "como esses textos conversam", "ligar as fichas" ou quiser saber quais leituras dialogam entre si no projeto.
---

# Relações entre textos (para a Mesa de fichas)

O objetivo é ajudar o pesquisador a ver como as leituras do projeto conversam entre si: quem se apoia em quem, quem critica, quem amplia, quem oferece o conceito que outro texto aplica. As sugestões viram setas na Mesa de fichas, onde ele decide quais ficam. Por isso, cada sugestão precisa ser justificável pelo conteúdo das fichas e útil para o projeto, não um exercício de associação livre.

## Entrada

1. **O arquivo "Fichas para o Claude"**, exportado pela Mesa (Exportar → Fichas para o Claude). Cada ficha vem com um identificador entre colchetes, como `[ABCD1234]`, e o arquivo lista também as associações que já existem.
2. **O contexto do projeto**: tema, pergunta de pesquisa, objetivos, hipóteses, capítulos ou eixos, conceitos centrais, fontes. Pode vir colado, num documento ou já conhecido da conversa.

Se o arquivo não vier, peça que o usuário o exporte da Mesa (não monte identificadores de cabeça). Se faltar o contexto do projeto, faça no máximo duas perguntas curtas (tema e pergunta de pesquisa; eixos ou capítulos). Se ele preferir seguir sem, trabalhe só com as fichas e diga isso em uma linha.

## Como trabalhar

1. **Ler as fichas inteiras**: tese, conceitos (com páginas), para lembrar, diálogos, uso no projeto, coleções e área na mesa.
2. **Procurar ligações, nesta ordem de força:**
   - **Diálogo explícito**: o campo "Diálogos" de uma ficha cita o autor de outra ficha do arquivo (ex.: "Koselleck (apoia-se em)" e existe uma ficha de Koselleck). É a ligação mais segura; use a relação registrada.
   - **Conceito compartilhado ou disputado**: o mesmo conceito, ou conceitos vizinhos, aparecem em fichas diferentes, no mesmo sentido ou em sentidos opostos.
   - **Teses que se completam ou se opõem.**
   - **Função no projeto**: um texto dá o quadro teórico que outro aplica a um caso, ou um texto é fonte/objeto que outro ajuda a ler. Use o contexto do projeto para julgar isso.
3. **Escolher a relação** em poucas palavras, lida como "A [relação] B". Prefira as relações já usadas nas associações existentes do arquivo e este vocabulário: *apoia-se em, critica, amplia, dialoga com, contrasta com, complementa, aplica o conceito de, fundamenta, é caso de, retoma*. A direção importa: em "Hartog apoia-se em Koselleck", A = Hartog.
4. **Escrever a nota** (1 a 3 frases): o ponto de contato concreto (conceito, tese, página das fichas quando houver) e por que essa relação importa para o projeto (que capítulo, argumento ou pergunta ela ajuda). Se for hipótese sua, e não algo que as fichas registram, diga "possível" ou "pode-se ler".
5. **Dar a confiança**:
   - **alta**: diálogo explícito nas fichas ou conceito compartilhado claramente;
   - **média**: aproximação temática ou teórica clara, mas não registrada nas fichas;
   - **baixa**: hipótese de leitura que vale a pena testar.

## Regras

- Use só identificadores que estão no arquivo, exatamente como aparecem (8 letras/números, sem colchetes no JSON).
- Não repita associações que já existem no arquivo (mesmo par de fichas, em qualquer direção).
- Uma associação por par de fichas; nunca ligue uma ficha a ela mesma.
- Qualidade antes de quantidade: em geral, entre metade e o dobro do número de fichas, no máximo 40. Se houver poucas ligações boas, entregue poucas.
- Não invente conteúdo, autores, diálogos nem páginas que não estão nas fichas. Página só se a ficha trouxer.
- Escreva em português, com a terminologia dos próprios autores.

## Saída (nesta ordem)

1. **Panorama** (3 a 6 linhas): os eixos ou agrupamentos que você percebeu entre os textos e como se ligam ao projeto.
2. **Lista legível**, uma linha por associação: `Autor (ano) → relação → Autor (ano) — nota (confiança)`.
3. **O bloco para importar**, exatamente neste formato (um único bloco de código `json`):

```json
{
  "formato": "mesa-de-fichas-associacoes",
  "versao": 1,
  "associacoes": [
    {
      "a": "ID_DA_FICHA_A",
      "b": "ID_DA_FICHA_B",
      "rel": "apoia-se em",
      "nota": "Ponto de contato e por que importa para o projeto.",
      "confianca": "alta"
    }
  ]
}
```

4. Uma linha final: **"Na Mesa de fichas: Menu → Importar associações, e cole esta resposta (ou só o bloco acima)."**

## Exemplo (trecho)

Fichas no arquivo: `[I87FSM7X] Certeau (1982), A escrita da história, cap. II` e `[HPMNEQ8B] Diehl (2008), Idéias de futuro no passado…`; projeto sobre um programa educacional e suas ideias de futuro.

Lista legível:
`Diehl (2008) → dialoga com → Certeau (1982) — Os dois tratam a escrita da história como operação situada: Certeau pelo lugar social [p. 66], Diehl pela crise do progresso [p. 53]; juntos sustentam a leitura dos materiais do programa como produto de um lugar e de um horizonte de futuro. (média)`

Bloco:

```json
{
  "formato": "mesa-de-fichas-associacoes",
  "versao": 1,
  "associacoes": [
    {
      "a": "HPMNEQ8B",
      "b": "I87FSM7X",
      "rel": "dialoga com",
      "nota": "Os dois tratam a escrita da história como operação situada: Certeau pelo lugar social [p. 66], Diehl pela crise do progresso [p. 53]; juntos sustentam a leitura dos materiais do programa como produto de um lugar e de um horizonte de futuro.",
      "confianca": "média"
    }
  ]
}
```
