# Tutorial da Mesa de fichas

Este guia é para quem não é programador. Siga na ordem; cada passo diz o que você deve ver.

1. [Como funciona](#como-funciona)
2. [Instalar o que é preciso](#1-instalar-o-que-é-preciso)
3. [Baixar o projeto](#2-baixar-o-projeto)
4. [Criar a chave do Zotero](#3-criar-a-chave-do-zotero)
5. [Configurar o `.env.local`](#4-configurar-o-envlocal)
6. [Abrir o app](#5-abrir-o-app)
7. [Instalar a skill de fichas no Claude](#6-instalar-a-skill-de-fichas-no-claude)
8. [Criar fichas e colocá-las no Zotero](#7-criar-fichas-e-colocá-las-no-zotero)
9. [O que já funciona](#o-que-já-funciona)
10. [Problemas comuns](#problemas-comuns)

## Como funciona

```
texto lido ──► Claude (skill ficha-academica) ──► nota no Zotero com a tag "ficha" ──► Mesa de fichas
```

1. Você lê um texto e pede ao Claude uma ficha curta, usando a skill que vem neste projeto.
2. Cola a ficha como **nota filha** do item no Zotero e coloca a tag `ficha`.
3. A Mesa de fichas busca essas notas no Zotero e mostra cada uma como um cartão.

O conteúdo das fichas mora no Zotero (para corrigir uma ficha, edite a nota lá). A arrumação da mesa (posições, cores, áreas, associações, anotações) mora no app, no seu navegador.

## 1. Instalar o que é preciso

- **Node.js**, versão LTS: baixe em https://nodejs.org e instale com as opções padrão. É ele que roda o app.
- **Git** (opcional, para baixar e atualizar o projeto): https://git-scm.com.
- Uma conta no **Zotero** com a biblioteca sincronizada na nuvem (em Zotero → Editar → Configurações → Sincronização).

No Windows, dá para instalar os dois pelo PowerShell:

```bash
winget install OpenJS.NodeJS.LTS
```

```bash
winget install Git.Git
```

Depois de instalar, feche e abra o PowerShell (ou o Terminal) de novo. Para conferir, rode `node --version`: deve aparecer algo como `v24.x.x`.

## 2. Baixar o projeto

**Com Git:**

```bash
git clone https://github.com/ghsantosalves/mesa-de-fichas.git
```

**Sem Git:** em https://github.com/ghsantosalves/mesa-de-fichas, clique em **Code → Download ZIP** e descompacte.

> Evite colocar a pasta dentro do OneDrive, Dropbox ou Google Drive: a instalação cria milhares de arquivos que essas ferramentas tentam sincronizar.

Depois, entre na pasta e instale as dependências (só na primeira vez):

```bash
cd mesa-de-fichas
```

```bash
npm install
```

Deve terminar com algo como `added NN packages` e `found 0 vulnerabilities`.

## 3. Criar a chave do Zotero

1. Entre em https://www.zotero.org/settings/keys (com sua conta).
2. Anote o número em **"Your userID for use in API calls is …"**. Esse é o seu `ZOTERO_USER_ID`.
3. Clique em **Create new private key** e marque **apenas**:
   - Personal Library → **Allow library access**
   - Personal Library → **Allow notes access**
   - Deixe **Allow write access** desmarcado.
   - Default Group Permissions → **None**.
4. Dê um nome (ex.: "Mesa de fichas"), clique em **Save Key** e copie a chave que aparece. Esse é o seu `ZOTERO_API_KEY`.

A chave só de leitura garante que, mesmo se ela vazar, ninguém consegue alterar sua biblioteca.

## 4. Configurar o `.env.local`

1. Na pasta do projeto, faça uma cópia do arquivo `.env.example` com o nome **`.env.local`**.
2. Abra o `.env.local` com o Bloco de Notas (ou outro editor de texto) e preencha, sem espaços nem aspas:

   ```
   ZOTERO_USER_ID=1234567
   ZOTERO_API_KEY=suachaveaqui
   ```

3. Salve.

O `.env.local` nunca vai para o git nem para o GitHub. A chave fica só no seu computador: o app a usa por dentro, e ela nem chega ao navegador.

## 5. Abrir o app

Na pasta do projeto, rode:

```bash
npm run dev
```

Abra no navegador o endereço que aparecer, normalmente http://localhost:5173.

- Se tudo estiver certo, a página mostra **"Tudo pronto"**, o seu nome de usuário do Zotero e as permissões da chave.
- Se aparecer **"Falta configurar o Zotero"** ou uma mensagem de erro, veja [Problemas comuns](#problemas-comuns).

Para fechar o app, volte ao terminal e aperte `Ctrl + C`. Sempre que mudar o `.env.local`, feche e rode `npm run dev` de novo.

**Onde a mesa fica salva.** A arrumação da mesa (posições, zoom, coleção escolhida) é salva sozinha **no navegador**, um instante depois de cada mudança; o aviso no canto inferior esquerdo diz "Mesa salva neste navegador". Por isso:

- use sempre o mesmo navegador e o mesmo endereço (http://localhost:5173). Em outro navegador, a mesa começa vazia;
- limpar os dados de navegação do navegador apaga a mesa (as fichas continuam seguras no Zotero);
- o app sempre abre na porta 5173. Se aparecer um erro dizendo que a porta está em uso, é porque o app já está aberto em outro terminal: feche aquele (`Ctrl + C`) ou use o que já está rodando.

## 6. Instalar a skill de fichas no Claude

A pasta `skill/ficha-academica/` tem uma *skill* do Claude: instruções que ensinam o Claude a escrever fichas exatamente no formato que a Mesa lê.

**No Claude (site ou app):**
1. Compacte a pasta `skill/ficha-academica` num arquivo `.zip` (no Windows: botão direito na pasta → Compactar para arquivo ZIP). O `.zip` deve conter a pasta `ficha-academica` com o `SKILL.md` dentro.
2. No Claude, abra **Configurações → Capacidades** (ou **Skills**) e envie o `.zip`.

**No Claude Code:** copie a pasta `skill/ficha-academica` para `~/.claude/skills/` (no Windows, `C:\Users\<seu usuário>\.claude\skills\`).

Se o menu estiver com outro nome na sua versão, procure por "Skills" nas configurações do Claude.

## 7. Criar fichas e colocá-las no Zotero

1. No Claude, envie o texto (PDF, capítulo) ou um fichamento que você já tenha e peça: **"faça a ficha deste texto"**.
2. O Claude devolve um bloco começando com `FICHA ·`. Confira, principalmente as páginas: `[p. ?]` quer dizer página a conferir.
3. No Zotero, clique com o botão direito no item do texto → **Adicionar nota** (nota filha, presa ao item).
4. Cole a ficha na nota.
5. Na nota, adicione a tag **`ficha`** (exatamente assim, minúsculo).
6. Coloque o **item** (não a nota) nas coleções que quiser. Na Mesa, as coleções servem de filtro: por exemplo, uma coleção por disciplina ou por capítulo da tese.
7. Espere o Zotero sincronizar (ícone de setas verde no canto superior direito).

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

Notas com a tag `ficha` que estiverem fora desse formato não somem: o app as mostrará numa lista "Fichas com problema", com o motivo.

## Usando a mesa

- **Mover:** arraste uma ficha pelo cartão; arraste o fundo (ou role a roda do mouse) para andar pela mesa.
- **Zoom:** Ctrl + roda do mouse, pinça no touchpad, ou os botões − e + da barra. **Ver tudo** enquadra as fichas.
- **Coleção:** o menu da barra mostra só as fichas de uma coleção (e de suas subcoleções).
- **Recolher uma ficha:** botão ▾ no canto da ficha, ou clique duplo nela. Recolhida, mostra só autor e obra. **Recolher todas / Expandir todas** na barra age sobre as fichas visíveis.
- **Cor e campos de uma ficha:** botão **⋯** no rodapé da ficha. Ali você escolhe a cor da borda e, em "Campos visíveis nesta ficha", desmarca o que não quer ver naquela ficha (tese, conceitos, para lembrar, diálogos, uso, referência, coleções). O rodapé avisa quantos campos estão ocultos. Nada disso altera o Zotero.
- **Áreas:** **Nova área** cria um retângulo no centro da tela, já com o título pronto para digitar. Arraste pelo título (ou pelo ⠿) para mover a área: as fichas de dentro vão junto. Puxe o canto inferior direito para mudar o tamanho. O × remove a área (pede um segundo clique) e as fichas continuam na mesa. Uma área criada com uma coleção escolhida aparece só nessa coleção.

## O que já funciona

O app está sendo construído em etapas:

| Etapa | O que faz | Situação |
| --- | --- | --- |
| 1 | App abre e confere a conexão com o Zotero | ✅ pronta |
| 2 | Lista coleções e fichas, com "Fichas com problema" | ✅ pronta |
| 3 | Fichas na mesa: arrastar, zoom, "Ver tudo", filtro por coleção | ✅ pronta |
| 4 | Salvar a mesa e reabrir de onde parou | ✅ pronta |
| 5 | Áreas, cores, recolher fichas, ocultar campos de cada ficha | ✅ pronta |
| 6 | Associações entre fichas, com relação e anotação | em breve |
| 7 | Tema, busca, exportar imagem e resumo em Markdown, salvar/abrir arquivo | em breve |
| 8 | Sincronização incremental, fichas novas e removidas | em breve |

## Problemas comuns

- **"node" não é reconhecido como comando**: o Node.js não foi instalado, ou o terminal foi aberto antes da instalação. Feche e abra o terminal.
- **"Falta configurar o Zotero"**: o `.env.local` não existe, está com outro nome (no Windows, cuidado com `.env.local.txt`) ou com campos vazios. Depois de corrigir, rode `npm run dev` de novo.
- **"O Zotero não reconheceu a chave"**: a chave foi copiada errada ou apagada. Crie outra no passo 3.
- **"A chave é do usuário X, mas ZOTERO_USER_ID está como Y"**: o número de usuário não bate com a chave; copie o userID da mesma página da chave.
- **Ler notas: não**: edite a chave em zotero.org/settings/keys e marque *Allow notes access*.
