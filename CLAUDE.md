# Cordatril

App para organizar visualmente fichas de leitura acadêmicas, como fichas físicas numa mesa: arrastar, agrupar, associar e anotar relações entre textos. As fichas vêm do Zotero do usuário.

## Sobre o usuário
- Quem mantém o projeto pode não ser programador: explique cada passo em português simples, diga o que é preciso fazer (instalar, rodar, testar) e o que esperar ver.
- Interface em português do Brasil (idioma principal) e em inglês. Todo texto da interface fica em `src/i18n.ts`, como par `[português, inglês]`; texto novo entra nos dois idiomas, nunca escrito direto no componente.
- Dados pessoais de quem mantém o projeto ficam em `CLAUDE.local.md` (fora do git), se existir.

## Referência
- `mesa-de-fichas.html` é o protótipo aprovado (arquivo local, fora do git, se existir). Ele define o comportamento e a aparência desejados. Leia-o inteiro antes de começar.
- O que muda em relação ao protótipo: as fichas passam a vir do Zotero (não são mais coladas à mão), e o arrastar deve ficar fluido (o do protótipo foi feito à mão e é ruim).

## Fonte dos dados: Zotero
- Zotero Web API v3 (`https://api.zotero.org`), biblioteca pessoal: `/users/{userID}/...`.
- O app é publicado como site no GitHub Pages (https://ghsantosalves.github.io/mesa-de-fichas/). No site, cada pessoa digita número de usuário e chave (só leitura, ou com escrita para usar "Nova ficha") na tela "Conectar ao seu Zotero"; ficam só no navegador dela (`src/zotero/credenciais.ts`) e vão só para api.zotero.org.
- Em `npm run dev`, as credenciais podem vir de `.env.local` (`ZOTERO_USER_ID`, `ZOTERO_API_KEY`); a chave fica no proxy do Vite e nunca vai para o navegador nem para o build. Nunca versionar esse arquivo; incluir no `.gitignore`.
- `zotero-plugin/` é um plugin do Zotero que só abre o site (menu Ferramentas); é empacotado e publicado junto com o site.
- Cabeçalhos: `Zotero-API-Key` e `Zotero-API-Version: 3`. Paginar com `limit=100` e `start`; respeitar `Backoff` e `Retry-After`.
- O app só escreve no Zotero em duas situações: (1) "Nova ficha" cria uma nota filha nova, com a tag `ficha`, no texto escolhido pelo usuário (`src/zotero/cadastro.ts`); (2) a cópia da mesa: uma nota do próprio app, com a tag `cordatril-mesa`, criada e atualizada com a arrumação inteira (`src/zotero/copiaMesa.ts`). Nunca altera nem apaga outros itens ou notas. Isso exige uma chave com "Allow write access"; com chave só de leitura, o app avisa e oferece copiar o texto. O Zotero é a fonte de verdade do conteúdo das fichas.

### Como achar as fichas
1. Fichas são notas filhas (`itemType=note`) com a tag `ficha`: `GET /users/{id}/items?itemType=note&tag=ficha`.
2. O texto está em `data.note`, em HTML (parágrafos, quebras, às vezes `<pre>`). Converter para texto puro preservando as quebras de linha antes de interpretar.
3. Notas filhas não ficam em coleções; as coleções estão no item pai. Buscar os itens pais (`data.parentItem`) e usar `data.collections` deles.
4. "Biblioteca", na interface, = coleção da biblioteca pessoal: `GET /users/{id}/collections` (há subcoleções via `parentCollection`; ao escolher uma coleção, incluir as subcoleções).
5. Sincronização: guardar a versão da biblioteca (`Last-Modified-Version`) e, nas próximas buscas, usar `since=` para baixar só o que mudou.
6. Validar cada passo com a API real antes de seguir; não presumir formatos sem ver uma resposta de verdade.

## Formato da ficha (gerado pela skill ficha-academica, em `skill/ficha-academica/`; versão em inglês: `skill/reading-card/`)
```
FICHA · Autor (ano), Título, trecho
Ref.: referência ABNT, cap./p. coberto

Tese: 1 a 2 frases. [p. X]

Conceitos: conceito [p. X] · conceito [p. X]

Para lembrar: uma frase.

Diálogos: Autor (relação) · Autor (relação)

Uso: teoria · metodologia
Vídeo: link ou "—"
Fichamento completo: link ou "—"
```
- Rótulos e ordem fixos; um campo pode ocupar mais de uma linha (continua até o próximo rótulo).
- Os rótulos também são aceitos em inglês (`CARD ·`, `Ref.`/`Reference`, `Thesis`, `Concepts`, `To remember`, `Dialogues`, `Use`, `Video`, `Full notes`); a tag é sempre `ficha`.
- `Conceitos` e `Uso` separados por ` · `; `—` significa vazio.
- O título antes do primeiro `)` é "Autor (ano)"; o resto é obra/trecho.
- Nota com a tag mas fora do formato: não descartar em silêncio; mostrar numa lista "Fichas com problema" com o motivo.

## Modelo de dados
- Conteúdo da ficha: vem do Zotero, somente leitura no app. Identificador = chave da nota no Zotero.
- Estado da mesa (só do app): posição, cor, recolhida/aberta de cada ficha; áreas; associações (ficha A, ficha B, relação em texto livre, anotação, posição e tamanho da caixa); tema; zoom e posição da vista; coleção selecionada.
- Fichas novas no Zotero aparecem numa faixa "Novas fichas" para o usuário posicionar.
- Ficha apagada no Zotero: não apagar as associações; marcar como "removida do Zotero" e deixar o usuário decidir.
- Para editar o conteúdo de uma ficha, o app oferece "Abrir no Zotero" (`zotero://select/library/items/{chaveDoItemPai}`); a edição acontece lá.
- Persistência: salvar sozinho a cada mudança e permitir salvar/abrir a mesa em arquivo `.json` (como no protótipo).

## Funcionalidades (todas do protótipo)
- Mesa infinita com arrastar, zoom (Ctrl + roda, pinça, botões) e "Ver tudo".
- Ficha completa (tese, conceitos, para lembrar, diálogos, uso no projeto como etiquetas, referência, coleções, links do vídeo e do fichamento) ou recolhida (só autor e título, mais estreita); "Recolher/Expandir todas".
- Cores da ficha; áreas com título editável, redimensionáveis, que levam junto as fichas de dentro.
- Associações: modo "Associar fichas", seta com direção (invertível), relação em texto livre com sugestões das já usadas, anotação; caixa da associação arrastável e redimensionável, com a seta (curva) passando por ela; associações e arrumação próprias de cada coleção (as feitas em "Todas" são gerais); clique duplo numa ficha ou caixa dá zoom nela; botão "Mapa" espalha as fichas e caixas sem sobreposição; "Recentralizar caixa"; mostrar/ocultar anotações.
- Painel da associação com as duas fichas (autor, obra, tese) visíveis e sem espremer.
- Busca que destaca fichas por qualquer campo, inclusive uso.
- Filtro por coleção.
- Tema claro, escuro ou do sistema; cores editáveis (fundo da mesa, fundo da ficha, texto, nomes dos campos, associações), guardadas por tema. Campos de formulário usam a cor da ficha, nunca a da mesa.
- Exportar: imagem PNG da mesa visível; resumo das associações em Markdown (referência e tese dos dois textos, área, relação A → B, anotação; opção de fichas completas).

## Stack (confirmada: Vite + React + TypeScript)
- App web local: Vite + React + TypeScript, rodando no navegador do computador do usuário.
- A chave do Zotero fica só no servidor do Vite (proxy `/zotero` → api.zotero.org em `vite.config.ts`); nunca enviá-la ao navegador.
- Mesa com uma biblioteca própria para quadros de nós e conexões (ex.: React Flow / @xyflow/react), para arrastar, zoom e conexões funcionarem bem com centenas de fichas.
- Exportar imagem com uma biblioteca de captura do DOM compatível com a escolhida.
- Evitar dependências além do necessário; perguntar antes de adicionar uma nova.

## Ordem de construção (testar com o usuário ao fim de cada etapa)
1. Projeto rodando com uma página vazia; `.env.local` configurado; instruções de como abrir.
2. Ler as coleções e as notas com a tag `ficha` e listá-las em texto, com o resultado da interpretação e as "Fichas com problema".
3. Mostrar as fichas na mesa (arrastar, zoom, ver tudo), com filtro por coleção.
4. Salvar o estado da mesa e reabrir de onde parou.
5. Áreas, cores, recolher.
6. Associações completas.
7. Tema, busca, exportações, salvar/abrir arquivo.
8. Sincronização incremental e tratamento de fichas novas/removidas.

## Regras de trabalho
- Passos pequenos; ao terminar cada um, dizer como testar.
- Não apagar nem sobrescrever dados do usuário sem confirmação.
- Usar git desde o início, com commits pequenos e mensagens em português.
- O repositório é público: nada de dados pessoais, credenciais ou caminhos da máquina de alguém nos arquivos versionados.
