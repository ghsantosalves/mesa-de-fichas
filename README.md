# Mesa de fichas

App para organizar visualmente fichas de leitura acadêmicas, como fichas de papel espalhadas numa mesa: arrastar, agrupar em áreas, associar textos entre si e anotar essas relações. As fichas vêm do seu **Zotero**: são notas com a tag `ficha`, escritas num formato fixo.

- Roda no seu computador, no navegador. Não há servidor na internet nem conta para criar.
- **Só lê** o Zotero; nunca altera nada lá.
- Cada pessoa usa o próprio Zotero, com a própria chave, guardada só no seu computador.

> **Em construção.** Hoje o app lê suas fichas do Zotero e as põe numa mesa onde dá para arrastar, dar zoom, filtrar por coleção, criar áreas, colorir, recolher fichas, ocultar campos e associar fichas com relação e anotação; a arrumação fica salva no navegador. As próximas etapas estão no [tutorial](docs/TUTORIAL.md#o-que-já-funciona).

## Começo rápido

Precisa de [Node.js](https://nodejs.org) (versão LTS).

```bash
git clone https://github.com/ghsantosalves/mesa-de-fichas.git
cd mesa-de-fichas
npm install
```

Copie `.env.example` para `.env.local`, preencha `ZOTERO_USER_ID` e `ZOTERO_API_KEY` e rode:

```bash
npm run dev
```

Abra http://localhost:5173 no navegador.

O passo a passo completo, inclusive como criar a chave do Zotero e como gerar fichas com a skill do Claude, está em **[docs/TUTORIAL.md](docs/TUTORIAL.md)**.

## O que tem aqui

| Pasta/arquivo | Para que serve |
| --- | --- |
| `src/` | Código do app (React + TypeScript). |
| `skill/ficha-academica/` | Skill do Claude que gera fichas no formato que o app lê. |
| `docs/TUTORIAL.md` | Tutorial de instalação e uso. |
| `.env.example` | Modelo do arquivo de credenciais (`.env.local`, que não vai para o git). |
| `CLAUDE.md` | Especificação do projeto, usada pelo Claude Code ao desenvolver. |

## Licença

[MIT](LICENSE): pode usar, copiar, modificar e redistribuir, inclusive a skill, desde que mantenha o aviso de autoria.
