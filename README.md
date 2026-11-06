# Cordatril

**Português** · [English](README.en.md)

*Cordatril* = **cordel** + **atril**. Na feira, os folhetos de cordel ficam pendurados num barbante; no atril, o livro fica aberto para a leitura. Aqui as fichas de leitura ficam abertas na mesa e ligadas por fios, para contar a história de uma pesquisa.

App para organizar visualmente fichas de leitura acadêmicas, como fichas de papel espalhadas numa mesa: arrastar, agrupar em áreas, associar textos entre si e anotar essas relações. As fichas vêm do seu **Zotero**: são notas com a tag `ficha`, escritas num formato fixo (gerado pela skill do Claude que vem neste projeto).

**Abrir:** https://ghsantosalves.github.io/mesa-de-fichas/

- É um site: não precisa instalar nada além do Zotero. Na primeira vez, você conecta sua conta do Zotero com uma chave só de leitura.
- Lê as fichas do Zotero e nunca altera nem apaga nada lá. As únicas escritas são opcionais e exigem uma chave com permissão de escrita: o botão **Nova ficha** cria a nota da ficha no texto escolhido, e a **cópia da mesa** fica guardada numa nota do próprio app (para não perder a arrumação e levá-la a outros computadores).
- Número e chave do Zotero e a arrumação da mesa ficam só no seu navegador.
- Interface em português e em inglês (**Menu → English**). Começa no idioma do navegador.
- Plugin opcional para o Zotero: **Ferramentas → Abrir Cordatril**.

O passo a passo completo, com a chave do Zotero, o plugin e a skill do Claude, está em **[docs/TUTORIAL.md](docs/TUTORIAL.md)**.

## O que tem aqui

| Pasta/arquivo | Para que serve |
| --- | --- |
| `src/` | Código do app (React + TypeScript + React Flow). |
| `zotero-plugin/` | Plugin do Zotero que abre o site pelo menu Ferramentas. |
| `skill/ficha-academica/` · `skill/reading-card/` | Skill do Claude que gera fichas no formato que o app lê (português · inglês). |
| `skill/relacoes-entre-textos/` · `skill/text-relations/` | Skill do Claude que sugere relações entre os textos do projeto, para importar no Cordatril (português · inglês). |
| `docs/TUTORIAL.md` | Tutorial de instalação e uso. |
| `.github/workflows/site.yml` | Publica o site e o plugin no GitHub Pages a cada envio. |
| `.env.example` | Modelo do `.env.local`, para rodar no computador com `npm run dev`. |
| `CLAUDE.md` | Especificação do projeto, usada pelo Claude Code ao desenvolver. |

## Licença

[MIT](LICENSE): pode usar, copiar, modificar e redistribuir, inclusive a skill e o plugin, desde que mantenha o aviso de autoria.
