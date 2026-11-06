# Tutorial do Cordatril

**Português** · [English](TUTORIAL.en.md)

Este guia é para quem não é programador. Siga na ordem; cada passo diz o que você deve ver. Não é preciso instalar nada além do Zotero: o Cordatril é um site.

**Site:** https://ghsantosalves.github.io/mesa-de-fichas/

A interface está em português e em inglês: **Menu → English (idioma)** troca o idioma (e **Menu → Português (language)** volta). Na primeira visita, ela segue o idioma do navegador.

1. [Como funciona](#como-funciona)
2. [Criar a chave do Zotero](#1-criar-a-chave-do-zotero)
3. [Instalar o botão no Zotero](#2-instalar-o-botão-no-zotero)
4. [Abrir a mesa e conectar](#3-abrir-a-mesa-e-conectar)
5. [Instalar a skill de fichas no Claude](#4-instalar-a-skill-de-fichas-no-claude)
6. [Criar fichas e colocá-las no Zotero](#5-criar-fichas-e-colocá-las-no-zotero)
7. [Usando a mesa](#usando-a-mesa)
8. [Fichas novas e fichas removidas](#fichas-novas-e-fichas-removidas)
9. [Onde ficam os dados](#onde-ficam-os-dados)
10. [Problemas comuns](#problemas-comuns)
11. [Para quem desenvolve](#para-quem-desenvolve)

## Como funciona

```
texto lido ──► Claude (skill ficha-academica) ──► nota no Zotero com a tag "ficha" ──► Cordatril
```

1. Você lê um texto e pede ao Claude uma ficha curta, usando a skill que vem neste projeto.
2. Cola a ficha como **nota filha** do item no Zotero e coloca a tag `ficha`.
3. O Cordatril busca essas notas no Zotero e mostra cada uma como um cartão, numa mesa onde você arrasta, agrupa em áreas e liga os textos entre si.

O conteúdo das fichas mora no Zotero (para corrigir uma ficha, edite a nota lá). A arrumação da mesa (posições, cores, áreas, associações, anotações) mora no seu navegador. O Cordatril **só lê** o Zotero: nunca muda nada lá.

Você precisa de uma conta no **Zotero** com a biblioteca sincronizada na nuvem (no Zotero: Editar → Configurações → Sincronização).

## 1. Criar a chave do Zotero

A chave é o que deixa o Cordatril ler suas notas.

1. Entre em https://www.zotero.org/settings/keys (com sua conta).
2. Anote o número em **"Your user ID for use in API calls is …"**.
3. Clique em **Create new private key** e marque **apenas**:
   - Personal Library → **Allow library access**
   - Personal Library → **Allow notes access**
   - Deixe **Allow write access** desmarcado.
   - Default Group Permissions → **None**.
4. Dê um nome (ex.: "Cordatril"), clique em **Save Key** e copie a chave que aparece. Guarde-a num lugar seguro: o site do Zotero só a mostra uma vez.

A chave só de leitura garante que, mesmo se ela vazar, ninguém consegue alterar sua biblioteca.

## 2. Instalar o botão no Zotero

O plugin acrescenta **Abrir Cordatril** ao menu **Ferramentas** do Zotero (e ao menu do botão direito dos itens). Ele só abre o site; não lê nem muda nada na biblioteca.

1. Baixe o plugin: https://ghsantosalves.github.io/mesa-de-fichas/mesa-de-fichas.xpi (se o navegador perguntar, escolha salvar o arquivo).
2. No Zotero, abra **Ferramentas → Plugins** (em inglês, *Tools → Plugins*).
3. Clique na engrenagem ⚙ no alto da janela → **Instalar plugin a partir de arquivo…** (*Install Plugin From File…*) e escolha o `mesa-de-fichas.xpi` baixado.
4. Feche a janela de plugins. Em **Ferramentas** deve aparecer **Abrir Cordatril**.

Sem o plugin, o Cordatril funciona do mesmo jeito: basta abrir o site no navegador (vale a pena salvá-lo nos favoritos).

## 3. Abrir a mesa e conectar

1. No Zotero, **Ferramentas → Abrir Cordatril** (ou abra o site no navegador).
2. Na primeira vez, aparece **Conectar ao seu Zotero**. Cole o número de usuário e a chave do passo 1 e clique em **Conectar**.
3. O site confere a chave com o Zotero. Se estiver tudo certo, aparecem suas fichas, arrumadas sozinhas em colunas.

Nas próximas vezes, o site abre direto na mesa, como você deixou.

## 4. Instalar as skills no Claude

O projeto traz duas *skills* do Claude (instruções que ensinam o Claude a fazer uma tarefa sempre do mesmo jeito):

| Skill | O que faz | Baixar |
| --- | --- | --- |
| `ficha-academica` | Escreve fichas exatamente no formato que o Cordatril lê. | https://ghsantosalves.github.io/mesa-de-fichas/ficha-academica.zip |
| `relacoes-entre-textos` | Sugere relações entre os textos do seu projeto, para importar no Cordatril (veja [Sugerir relações com o Claude](#sugerir-relações-com-o-claude)). | https://ghsantosalves.github.io/mesa-de-fichas/relacoes-entre-textos.zip |

**No Claude (site ou app):** baixe o `.zip`, abra **Configurações → Capacidades** (ou **Skills**) e envie o arquivo. Não descompacte.

**No Claude Code:** descompacte e copie a pasta (por exemplo `relacoes-entre-textos`) para `~/.claude/skills/` (no Windows, `C:\Users\<seu usuário>\.claude\skills\`).

Se o menu estiver com outro nome na sua versão, procure por "Skills" nas configurações do Claude.

## 5. Criar fichas e colocá-las no Zotero

1. No Claude, envie o texto (PDF, capítulo) ou um fichamento que você já tenha e peça: **"faça a ficha deste texto"**.
2. O Claude devolve um bloco começando com `FICHA ·`. Confira, principalmente as páginas: `[p. ?]` quer dizer página a conferir.
3. No Zotero, clique com o botão direito no item do texto → **Adicionar nota** (nota filha, presa ao item).
4. Cole a ficha na nota.
5. Na nota, adicione a tag **`ficha`** (exatamente assim, minúsculo).
6. Coloque o **item** (não a nota) nas coleções que quiser. No Cordatril, as coleções servem de filtro: por exemplo, uma coleção por disciplina ou por capítulo da tese.
7. Espere o Zotero sincronizar (ícone de setas verde no canto superior direito). Ao voltar para a aba do Cordatril, ele confere sozinho se há novidades.

O formato completo, para quem quiser escrever fichas à mão:

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

Os rótulos também podem estar em inglês (`CARD ·`, `Thesis:`, `Concepts:`, `To remember:`, `Dialogues:`, `Use:`, `Video:`, `Full notes:`); a tag continua sendo `ficha`.

Notas com a tag `ficha` que estiverem fora desse formato não somem: aparecem no botão **Fichas com problema**, com o motivo.

## Usando a mesa

A barra do topo, da esquerda para a direita: **coleção** e **busca** · **Mesa | Lista** · ferramentas da mesa (**Nova área**, **Recolher todas**, **Associar fichas**, **✏ Desenhar**, **Anotações visíveis**) · zoom e **Menu**.

- **Mover:** arraste uma ficha pelo cartão; arraste o fundo (ou role a roda do mouse) para andar pela mesa.
- **Zoom:** Ctrl + roda do mouse, pinça no touchpad, ou os botões − e + da barra. **Ver tudo** enquadra as fichas.
- **Coleção:** o menu da barra mostra só as fichas de uma coleção (e de suas subcoleções).
- **Busca:** o campo "Destacar conceito, autor…" apaga as fichas que não têm o texto digitado, em qualquer campo (inclusive uso e campos ocultos), sem diferenciar acentos nem maiúsculas.
- **Lista:** mostra as fichas em texto, para conferir como cada nota foi lida.
- **Recolher uma ficha:** botão ▾ no canto da ficha, ou clique duplo nela. Recolhida, mostra só autor e obra. **Recolher todas / Expandir todas** age sobre as fichas visíveis.
- **Cor e campos de uma ficha:** botão **⋯** no rodapé da ficha. Ali você escolhe a cor da borda e, em "Campos visíveis nesta ficha", desmarca o que não quer ver naquela ficha. O rodapé avisa quantos campos estão ocultos.
- **Áreas:** **Nova área** cria um retângulo no centro da tela, já com o título pronto para digitar. Arraste pelo título (ou pelo ⠿) para mover a área: as fichas de dentro vão junto. Puxe o canto inferior direito para mudar o tamanho. O × remove a área (pede um segundo clique) e as fichas continuam na mesa. Uma área criada com uma coleção escolhida aparece só nessa coleção.
- **Associar fichas:** ligue **Associar fichas**, clique na ficha de onde parte a relação e depois na outra. Aparece uma seta da primeira para a segunda, com uma caixa no meio, e abre o painel da associação. Esc sai do modo de associar.
- **Painel da associação:** mostra as duas fichas (autor, obra, tese). Escreva a **relação** (texto livre; os botões sugerem as já usadas) e a **anotação**. **Inverter direção**, **Recentralizar caixa** e **Remover associação** (pede um segundo clique). Fechar ou Esc fecha o painel.
- **Caixa da associação:** clique para abrir o painel; arraste para tirá-la de cima de alguma coisa (um tracejado a liga à seta); puxe o canto para mudar o tamanho. **Anotações visíveis** mostra ou esconde as anotações nas caixas.
- **Desenhar (botão do lápis ✏):** abre uma paleta no alto da mesa:
  - **Caneta**: traços à mão (setas, círculos, sublinhados), em cinco cores e três espessuras (fina, média, grossa);
  - **Marcador**: traços largos e transparentes, como marca-texto, por cima de fichas ou da mesa, também em três espessuras;
  - **Grifar texto**: selecione um trecho de uma ficha (tese, conceitos, para lembrar, diálogos ou referência) e ele fica grifado na cor escolhida. Clique num grifo para tirá-lo. Enquanto essa ferramenta está ligada, as fichas não se arrastam;
  - **Borracha**: passe por cima de um traço para apagá-lo;
  - **Desfazer** (ou Ctrl+Z) e **✕** (ou Esc) para parar de desenhar.

  Os desenhos acompanham a mesa ao arrastar e dar zoom, aparecem na coleção em que foram feitos, ficam salvos e saem na imagem exportada. Grifos e desenhos não mudam nada no Zotero.
- **Menu:**
  - **Buscar novidades no Zotero** (o Cordatril também faz isso sozinho ao voltar para a aba) e **Ler tudo do Zotero de novo** (se algo parecer desatualizado).
  - **Tema:** claro, escuro ou igual ao sistema, com cinco cores editáveis, guardadas separadamente para o claro e o escuro.
  - **Exportar:** imagem PNG do que está visível na coleção escolhida; **resumo das associações** em Markdown (copiar ou baixar `.md`); **fichas para o Claude** (veja abaixo).
  - **Importar associações:** coloca na mesa as relações sugeridas pelo Claude.
  - **Salvar ou abrir:** baixa um `.json` com toda a arrumação ou abre um salvo antes (a mesa anterior fica como cópia de segurança no navegador).
  - **English (idioma):** mostra a interface em inglês (e **Português (language)** volta).
  - **Desconectar do Zotero:** esquece o número e a chave neste navegador.

## Sugerir relações com o Claude

Com a skill `relacoes-entre-textos` instalada (passo 4):

1. No Cordatril, escolha a coleção e abra **Menu → Exportar… → Fichas para o Claude → Baixar fichas para o Claude**. O arquivo traz cada ficha com um identificador, como `[ABCD1234]`, e as associações que já existem.
2. No Claude, envie esse arquivo junto com o **contexto do projeto** (tema, pergunta de pesquisa, objetivos, capítulos ou eixos; pode ser o texto do projeto) e peça: **"sugira as relações entre esses textos para o Cordatril"**.
3. O Claude responde com um panorama, uma lista legível (Autor → relação → Autor, com justificativa e confiança) e um bloco de código no fim.
4. No Cordatril, **Menu → Importar associações**: cole a resposta inteira (ou só o bloco). Aparece a lista; as sugestões que repetem associações existentes vêm desmarcadas, e as que citam fichas que não existem ficam bloqueadas. Marque as que quiser e clique em **Colocar na mesa**.

As associações importadas são iguais às feitas à mão: dá para editar a relação e a anotação, inverter, mover a caixa ou remover. Se uma das fichas ainda estiver na faixa "Novas fichas", a seta aparece quando ela for colocada na mesa.

## Fichas novas e fichas removidas

- **Fichas novas:** fichas que chegam do Zotero depois da primeira vez aparecem na faixa **Novas fichas**, no canto inferior esquerdo, e um aviso diz quantas chegaram. Arraste cada uma para o lugar que quiser na mesa, clique em **Colocar** (ela vai para um espaço vazio da tela) ou em **Colocar todas**.
- **Fichas removidas:** se uma ficha que estava na mesa some do Zotero (nota apagada, na lixeira ou sem a tag `ficha`), ela continua na mesa com a faixa **Removida do Zotero**, mostrando o último conteúdo conhecido. As associações dela **não são apagadas**. Se a nota voltar ao Zotero, a ficha volta ao normal. Para tirá-la de vez, clique em **Tirar da mesa** (pede um segundo clique e avisa quantas associações vão junto).
- **Sincronização:** o Cordatril guarda uma cópia do que já baixou e, nas próximas vezes, pede ao Zotero só o que mudou. Por isso abre rápido mesmo com muitas fichas.

## Onde ficam os dados

- **Fichas:** no Zotero. O Cordatril só lê.
- **Número e chave do Zotero:** só no seu navegador; são enviados só para o Zotero (api.zotero.org).
- **Arrumação da mesa:** salva sozinha **no navegador**, um instante depois de cada mudança ("Mesa salva neste navegador", no canto). Por isso:
  - em outro navegador ou computador, a mesa começa vazia. Para levar a arrumação, use **Menu → Salvar ou abrir**: salve o arquivo num e abra no outro;
  - limpar os dados de navegação apaga a arrumação (as fichas continuam seguras no Zotero). De vez em quando, salve a mesa em arquivo.

## Problemas comuns

- **"O Zotero não reconheceu a chave"**: a chave foi copiada pela metade ou foi apagada. Crie outra (passo 1).
- **"Esta chave é do usuário X, não do Y"**: o número de usuário não bate com a chave; copie o número da mesma página da chave.
- **"A chave precisa de permissão…"**: edite a chave em zotero.org/settings/keys e marque *Allow library access* e *Allow notes access*.
- **Uma ficha nova não aparece:** confira se o Zotero sincronizou, se a nota tem a tag `ficha` e se a coleção escolhida na barra é a do item. Depois use **Menu → Buscar novidades no Zotero**.
- **"Abrir Cordatril" não aparece no Zotero:** em Ferramentas → Plugins, confira se o plugin está ativado. Se o Zotero disser que ele é incompatível com a sua versão, use o site direto pelo navegador e avise no GitHub.

## Para quem desenvolve

Para rodar o código no seu computador (para modificar o app):

1. Instale o [Node.js](https://nodejs.org) (versão LTS) e o [Git](https://git-scm.com). No Windows: `winget install OpenJS.NodeJS.LTS` e `winget install Git.Git`.
2. `git clone https://github.com/ghsantosalves/mesa-de-fichas.git`, entre na pasta e rode `npm install` (evite pastas do OneDrive/Dropbox).
3. Opcional: copie `.env.example` para `.env.local` e preencha `ZOTERO_USER_ID` e `ZOTERO_API_KEY`. Assim a chave fica só no servidor local e o app não pede conexão. Sem o `.env.local`, ele mostra a tela de conexão, como o site.
4. `npm run dev` e abra http://localhost:5173 (porta fixa; a mesa fica salva por endereço).

A cada envio para a branch `main`, o GitHub publica o site e o plugin (`zotero-plugin/`) sozinho (`.github/workflows/site.yml`).
