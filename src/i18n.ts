// Idiomas da interface: português do Brasil e inglês.
//
// O idioma vem da escolha salva no navegador ou, na primeira vez, do idioma do
// próprio navegador (português → pt-BR; qualquer outro → inglês). Trocar de
// idioma recarrega a página (a mesa está sempre salva).

export type Idioma = 'pt-BR' | 'en'
const CHAVE = 'mesa-de-fichas:idioma'

function detectar(): Idioma {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'pt-BR' || salvo === 'en') return salvo
  } catch {
    /* sem acesso ao armazenamento */
  }
  const doNavegador = navigator.languages?.length ? navigator.languages : [navigator.language]
  return doNavegador.some((l) => l?.toLowerCase().startsWith('pt')) ? 'pt-BR' : 'en'
}

export const idioma: Idioma = detectar()
document.documentElement.lang = idioma

export function mudarIdioma(novo: Idioma) {
  try {
    localStorage.setItem(CHAVE, novo)
  } catch {
    /* sem acesso ao armazenamento */
  }
  location.reload()
}

/** Nome do app (o mesmo nos dois idiomas). */
export const NOME_APP = 'Cordatril'
document.title = NOME_APP

// Cada texto: [português, inglês]. {nome} é trocado pelo valor passado em t().
const TEXTOS = {
  // Barra e menu
  'app.subtitulo': ['mesa de fichas de leitura', 'reading card table'],
  'barra.busca': ['Destacar conceito, autor…', 'Highlight concept, author…'],
  'barra.buscaRotulo': ['Destacar fichas', 'Highlight cards'],
  'barra.modoVer': ['Modo de ver', 'View mode'],
  'barra.mesa': ['Mesa', 'Table'],
  'barra.lista': ['Lista', 'List'],
  'barra.problemas': ['Fichas com problema ({n})', 'Cards with problems ({n})'],
  'barra.associar': ['Associar fichas', 'Link cards'],
  'barra.desenhar': ['Desenhar', 'Draw'],
  'barra.desenharDica': ['Desenhar: caneta, marcador e grifo (Esc para sair)', 'Draw: pen, highlighter and text highlight (Esc to exit)'],
  'barra.anotacoes': ['Anotações visíveis', 'Notes visible'],
  'barra.novaArea': ['Nova área', 'New area'],
  'barra.recolherTodas': ['Recolher todas', 'Collapse all'],
  'barra.expandirTodas': ['Expandir todas', 'Expand all'],
  'barra.diminuirZoom': ['Diminuir zoom', 'Zoom out'],
  'barra.aumentarZoom': ['Aumentar zoom', 'Zoom in'],
  'assoc.colecao': ['Coleção', 'Collection'],
  'assoc.geral': ['Geral (aparece em todas as coleções)', 'General (shown in every collection)'],
  'aviso.assocMovida': ['Associação movida para “{col}”', 'Link moved to “{col}”'],
  'barra.mapa': ['Mapa', 'Map'],
  'barra.mapaDica': [
    'Arruma as fichas visíveis pelas relações, sem nada sobreposto: as ligadas ficam perto, as soltas ficam embaixo',
    'Arranges the visible cards by their links with nothing overlapping: linked cards end up close, unlinked ones below',
  ],
  'barra.desfazerMapa': ['Voltar à arrumação anterior', 'Back to the previous layout'],
  'aviso.mapa': ['Mesa arrumada pelas relações. A seta ↶ volta à arrumação anterior.', 'Table arranged by links. The ↶ arrow restores the previous layout.'],
  'aviso.mapaPoucas': ['É preciso ter pelo menos duas fichas visíveis.', 'At least two visible cards are needed.'],
  'leg.rotulo': ['Legenda das relações', 'Relations legend'],
  'leg.titulo': ['Relações ({n})', 'Relations ({n})'],
  'leg.esconder': ['Clique para esconder estas associações', 'Click to hide these links'],
  'leg.mostrar': ['Clique para mostrar estas associações', 'Click to show these links'],
  'leg.mostrarTodas': ['Mostrar todas', 'Show all'],
  'leg.foco': ['Em foco: {f}', 'In focus: {f}'],
  'nova.botao': ['Nova ficha', 'New card'],
  'nova.titulo': ['Nova ficha', 'New card'],
  'nova.explica': [
    'Escolha o texto: o que o Zotero já sabe dele (autor, ano, título e referência) vem preenchido. Complete o resto e salve: a ficha vira uma nota do texto no Zotero, com a tag “ficha”.',
    'Choose the text: what Zotero already knows about it (author, year, title and reference) is filled in. Complete the rest and save: the card becomes a note on the text in Zotero, tagged “ficha”.',
  ],
  'nova.colecao': ['Coleção', 'Collection'],
  'nova.buscar': ['Buscar texto (autor, título, ano)', 'Search text (author, title, year)'],
  'nova.buscarTodas': ['Digite ao menos 2 letras para buscar em toda a biblioteca.', 'Type at least 2 letters to search the whole library.'],
  'nova.carregando': ['Lendo os textos do Zotero…', 'Reading texts from Zotero…'],
  'nova.nenhum': ['Nenhum texto encontrado.', 'No texts found.'],
  'nova.jaTem': ['já tem ficha', 'already has a card'],
  'nova.texto': ['Texto', 'Text'],
  'nova.trocar': ['Trocar texto', 'Change text'],
  'nova.cabecalho': ['Autor (ano), título e trecho', 'Author (year), title and excerpt'],
  'nova.cabecalhoDica': ['Ex.: acrescente “cap. 2” ou “p. 10-30” ao final.', 'E.g. add “ch. 2” or “pp. 10-30” at the end.'],
  'nova.ref': ['Referência', 'Reference'],
  'nova.refDica': ['Montada com os dados do Zotero; confira e acrescente o capítulo ou as páginas.', 'Built from Zotero data; check it and add the chapter or pages.'],
  'nova.listaDica': ['Separe os itens com “ · ” (ponto médio), como no formato da ficha.', 'Separate items with “ · ” (middle dot), as in the card format.'],
  'nova.obrigatoria': ['A tese é obrigatória (sem ela a ficha vai para “Fichas com problema”).', 'The thesis is required (without it the card goes to “Cards with problems”).'],
  'nova.previa': ['Como a nota vai ficar', 'How the note will look'],
  'nova.salvar': ['Salvar no Zotero', 'Save to Zotero'],
  'nova.salvando': ['Salvando no Zotero…', 'Saving to Zotero…'],
  'nova.salva': ['Ficha salva no Zotero. Ela aparece em “Novas fichas” em instantes.', 'Card saved to Zotero. It will appear in “New cards” in a moment.'],
  'nova.copiar': ['Copiar texto', 'Copy text'],
  'nova.copiado': ['Texto copiado: cole como nota do texto no Zotero, com a tag “ficha”.', 'Text copied: paste it as a note on the text in Zotero, tagged “ficha”.'],
  'nova.abrirZotero': ['Abrir o texto no Zotero', 'Open the text in Zotero'],
  'nova.conferindo': ['Conferindo se a chave pode escrever…', 'Checking whether the key can write…'],
  'nova.chaveLeitura': [
    'Sua chave do Zotero é só de leitura, então o app não pode salvar a ficha. Para salvar daqui, crie uma chave com “Allow write access” em zotero.org/settings/keys e conecte de novo (Menu → Desconectar do Zotero). Enquanto isso, use “Copiar texto”.',
    'Your Zotero key is read-only, so the app cannot save the card. To save from here, create a key with “Allow write access” at zotero.org/settings/keys and connect again (Menu → Disconnect from Zotero). Meanwhile, use “Copy text”.',
  ],
  'nova.chaveLeituraLocal': [
    'A chave do .env.local é só de leitura. Para salvar daqui, use uma chave com “Allow write access”. Enquanto isso, use “Copiar texto”.',
    'The .env.local key is read-only. To save from here, use a key with “Allow write access”. Meanwhile, use “Copy text”.',
  ],
  'nova.semEscrita': ['O Zotero não deixou criar a nota: a chave não tem permissão de escrita.', 'Zotero did not allow creating the note: the key has no write permission.'],
  'nova.falhou': ['O Zotero não criou a nota. {motivo}', 'Zotero did not create the note. {motivo}'],
  'nova.semAutor': ['Sem autor', 'No author'],
  'rec.entrar': ['Recorte', 'Cutout'],
  'rec.dica': [
    'Mostra só este texto e os ligados a ele, para caminhar pelas relações',
    'Shows only this text and the ones linked to it, to walk through the relations',
  ],
  'rec.titulo': ['Recorte: {f}', 'Cutout: {f}'],
  'rec.teclas': [
    '← → passam pelas associações e textos · Enter abre · clique num texto para ir até ele',
    '← → step through links and texts · Enter opens · click a text to go to it',
  ],
  'rec.voltar': ['← Voltar', '← Back'],
  'rec.sair': ['Sair do recorte (Esc)', 'Exit cutout (Esc)'],
  'leg.sairFoco': ['Sair do foco (Esc)', 'Exit focus (Esc)'],
  'barra.verTudo': ['Ver tudo', 'Fit all'],
  'barra.colecao': ['Coleção', 'Collection'],
  'barra.todasColecoes': ['Todas as coleções ({n})', 'All collections ({n})'],
  'menu.botao': ['Menu ▾', 'Menu ▾'],
  'menu.novidades': ['Buscar novidades no Zotero', 'Check Zotero for updates'],
  'menu.lerTudo': ['Ler tudo do Zotero de novo', 'Reload everything from Zotero'],
  'menu.tema': ['Tema…', 'Theme…'],
  'menu.exportar': ['Exportar…', 'Export…'],
  'menu.importar': ['Importar associações…', 'Import links…'],
  'menu.arquivo': ['Salvar ou abrir…', 'Save or open…'],
  'menu.idioma': ['English (idioma)', 'Português (language)'],
  'menu.desconectar': ['Desconectar do Zotero…', 'Disconnect from Zotero…'],
  'menu.confirmaDesconectar': [
    'Desconectar do Zotero neste navegador? O número e a chave serão esquecidos aqui. A mesa continua salva.',
    'Disconnect from Zotero in this browser? The user ID and key will be forgotten here. Your table stays saved.',
  ],

  // Avisos gerais
  'aviso.erroLer': ['Não deu certo ler o Zotero', 'Could not read Zotero'],
  'aviso.tentarDeNovo': ['Tentar de novo', 'Try again'],
  'aviso.lendo': ['Lendo o Zotero…', 'Reading Zotero…'],
  'aviso.novas.1': ['1 ficha nova chegou do Zotero', '1 new card arrived from Zotero'],
  'aviso.novas.n': ['{n} fichas novas chegaram do Zotero', '{n} new cards arrived from Zotero'],
  'aviso.sumiram.1': ['1 ficha sumiu do Zotero', '1 card disappeared from Zotero'],
  'aviso.sumiram.n': ['{n} fichas sumiram do Zotero', '{n} cards disappeared from Zotero'],
  'aviso.associar': ['Clique em duas fichas para associá-las. Esc para sair.', 'Click two cards to link them. Esc to exit.'],
  'aviso.segunda': ['Agora clique na segunda ficha', 'Now click the second card'],
  'aviso.assocRemovida': ['Associação removida', 'Link removed'],
  'aviso.importadas.1': ['1 associação colocada na mesa', '1 link placed on the table'],
  'aviso.importadas.n': ['{n} associações colocadas na mesa', '{n} links placed on the table'],

  // Salvamento
  'salvo.ok': ['Mesa salva neste navegador', 'Table saved in this browser'],
  'salvo.pendente': ['Salvando…', 'Saving…'],
  'salvo.nova': ['Mesa nova: as mudanças serão salvas neste navegador', 'New table: changes will be saved in this browser'],
  'salvo.recuperado': [
    'A mesa salva estava ilegível e começou de novo. Uma cópia do conteúdo antigo foi guardada no navegador.',
    'The saved table was unreadable and started over. A copy of the old content was kept in the browser.',
  ],
  'salvo.semAcesso': ['O navegador não deixa salvar a mesa.', 'The browser does not allow saving the table.'],
  'salvo.erro': ['Não foi possível salvar a mesa neste navegador.', 'Could not save the table in this browser.'],

  // Conexão
  'con.titulo': ['Conectar ao seu Zotero', 'Connect to your Zotero'],
  'con.userId': ['Número de usuário (user ID)', 'User ID'],
  'con.userIdEx': ['ex.: 1234567', 'e.g. 1234567'],
  'con.chave': ['Chave (key)', 'API key'],
  'con.chaveEx': ['cole aqui a chave', 'paste the key here'],
  'con.conferindo': ['Conferindo…', 'Checking…'],
  'con.conectar': ['Conectar', 'Connect'],
  'con.dica': [
    'O número e a chave ficam guardados só neste navegador e são enviados só para o Zotero (api.zotero.org). Para tirar, use Menu → Desconectar do Zotero.',
    'The user ID and key are stored only in this browser and sent only to Zotero (api.zotero.org). To remove them, use Menu → Disconnect from Zotero.',
  ],
  'con.erroDigitos': ['O número de usuário deve ter só algarismos.', 'The user ID must contain digits only.'],
  'con.erroFaltaChave': ['Falta a chave.', 'The key is missing.'],
  'con.erroRede': ['Não consegui falar com o Zotero. Confira a internet.', 'Could not reach Zotero. Check your internet connection.'],
  'con.erroChave': [
    'O Zotero não reconheceu a chave. Confira se copiou a chave inteira.',
    'Zotero did not recognize the key. Check that you copied the whole key.',
  ],
  'con.erroStatus': ['O Zotero respondeu com erro {n}.', 'Zotero answered with error {n}.'],
  'con.erroUsuario': [
    'Esta chave é do usuário {chave}, não do {digitado}. Confira o número.',
    'This key belongs to user {chave}, not {digitado}. Check the user ID.',
  ],
  'con.erroPermissao': [
    'A chave precisa de permissão para ler a biblioteca e as notas (Allow library access e Allow notes access).',
    'The key needs permission to read the library and notes (Allow library access and Allow notes access).',
  ],

  // Erros da API
  'api.faltaConectar': ['Falta conectar ao Zotero.', 'Not connected to Zotero yet.'],
  'api.erroRedeLocal': [
    'Não consegui falar com o Zotero. Confira a internet e se o app está rodando (npm run dev).',
    'Could not reach Zotero. Check your internet connection and that the app is running (npm run dev).',
  ],
  'api.recusouLocal': ['O Zotero recusou o acesso. Confira ZOTERO_API_KEY no .env.local.', 'Zotero refused access. Check ZOTERO_API_KEY in .env.local.'],
  'api.recusou': [
    'O Zotero recusou a chave (ela pode ter sido apagada ou mudada). Conecte de novo.',
    'Zotero refused the key (it may have been deleted or changed). Please connect again.',
  ],

  // Fichas: campos
  'campo.tese': ['Tese', 'Thesis'],
  'campo.conceitos': ['Conceitos', 'Concepts'],
  'campo.lembrar': ['Para lembrar', 'To remember'],
  'campo.dialogos': ['Diálogos', 'Dialogues'],
  'campo.usos': ['Uso no projeto', 'Use in the project'],
  'campo.ref': ['Referência', 'Reference'],
  'campo.colecoes': ['Coleções', 'Collections'],
  'ficha.video': ['Vídeo da aula', 'Lecture video'],
  'ficha.fichamento': ['Fichamento completo', 'Full reading notes'],
  'ficha.abrirZotero': ['Abrir no Zotero', 'Open in Zotero'],
  'ficha.expandir': ['Expandir', 'Expand'],
  'ficha.recolher': ['Recolher', 'Collapse'],
  'ficha.expandirFicha': ['Expandir ficha', 'Expand card'],
  'ficha.recolherFicha': ['Recolher ficha', 'Collapse card'],
  'ficha.opcoes': ['Opções da ficha', 'Card options'],
  'ficha.corFicha': ['Cor da ficha', 'Card color'],
  'ficha.semCor': ['sem cor', 'no color'],
  'ficha.camposVisiveis': ['Campos visíveis nesta ficha', 'Fields shown on this card'],
  'ficha.ocultos.1': ['1 campo oculto', '1 hidden field'],
  'ficha.ocultos.n': ['{n} campos ocultos', '{n} hidden fields'],
  'ficha.tirarGrifo': ['Clique para tirar o grifo', 'Click to remove the highlight'],
  'ficha.semDados': ['Ficha sem dados', 'Card without data'],
  'ficha.semColecao': ['Sem coleção', 'No collection'],
  'cor.amarelo': ['amarelo', 'yellow'],
  'cor.azul': ['azul', 'blue'],
  'cor.verde': ['verde', 'green'],
  'cor.rosa': ['rosa', 'pink'],
  'cor.cinza': ['cinza', 'gray'],

  // Ficha removida do Zotero
  'rem.faixa': ['Removida do Zotero', 'Removed from Zotero'],
  'rem.explica': [
    'A nota foi apagada, foi para a lixeira ou perdeu a tag “ficha”{quando}. Se ela voltar ao Zotero, a ficha volta ao normal aqui.',
    'The note was deleted, moved to the trash or lost the “ficha” tag{quando}. If it comes back to Zotero, the card goes back to normal here.',
  ],
  'rem.quando': [' (notado em {data})', ' (noticed on {data})'],
  'rem.assoc.1': ['A associação dela continua guardada.', 'Its link is still kept.'],
  'rem.assoc.n': ['As {n} associações dela continuam guardadas.', 'Its {n} links are still kept.'],
  'rem.tirar': ['Tirar da mesa', 'Remove from table'],
  'rem.confirma': ['Clique de novo para tirar', 'Click again to remove'],
  'rem.confirma.1': ['Clique de novo: tira a ficha e a associação', 'Click again: removes the card and its link'],
  'rem.confirma.n': ['Clique de novo: tira a ficha e as {n} associações', 'Click again: removes the card and its {n} links'],

  // Mesa
  'mesa.semFichas': ['Ainda não há fichas no Zotero.', 'There are no cards in Zotero yet.'],
  'mesa.semFichasColecao': ['Nenhuma ficha nesta coleção.', 'No cards in this collection.'],

  // Áreas
  'area.nova': ['Nova área', 'New area'],
  'area.padrao': ['Área', 'Area'],
  'area.arrastar': ['Arraste para mover a área e as fichas de dentro', 'Drag to move the area and the cards inside it'],
  'area.titulo': ['Título da área', 'Area title'],
  'area.remover': ['Remover área', 'Remove area'],
  'area.confirma': ['Clique de novo para remover a área', 'Click again to remove the area'],

  // Novas fichas
  'novas.titulo': ['Novas fichas ({n})', 'New cards ({n})'],
  'novas.rotulo': ['Novas fichas', 'New cards'],
  'novas.colocarTodas': ['Colocar todas', 'Place all'],
  'novas.colocar': ['Colocar', 'Place'],
  'novas.dica': ['Chegaram do Zotero. Arraste para a mesa ou clique em Colocar.', 'They arrived from Zotero. Drag them onto the table or click Place.'],
  'novas.nenhuma': ['Nenhuma nova nesta coleção.', 'No new cards in this collection.'],
  'novas.outras': [' Há mais {n} em outras coleções.', ' There are {n} more in other collections.'],
  'novas.arraste': ['Arraste para a mesa', 'Drag onto the table'],

  // Associações
  'assoc.aDefinir': ['relação a definir', 'relation to define'],
  'assoc.semAnotacao': ['Sem anotação', 'No note'],
  'assoc.rotulo': ['Associação: {rel}', 'Link: {rel}'],
  'assoc.painel': ['Associação entre fichas', 'Link between cards'],
  'assoc.titulo': ['Associação', 'Link'],
  'assoc.fechar': ['Fechar', 'Close'],
  'assoc.relacao': ['Relação', 'Relation'],
  'assoc.relacaoEx': ['Escreva a relação, ex.: retoma o conceito de', 'Write the relation, e.g. takes up the concept of'],
  'assoc.anotacao': ['Anotação', 'Note'],
  'assoc.anotacaoEx': [
    'O que liga estes dois textos? Ponto de contato, contraste, hipótese de leitura…',
    'What connects these two texts? Point of contact, contrast, reading hypothesis…',
  ],
  'assoc.inverter': ['Inverter direção', 'Reverse direction'],
  'assoc.recentralizar': ['Recentralizar caixa', 'Re-center box'],
  'assoc.remover': ['Remover associação', 'Remove link'],
  'assoc.confirma': ['Clique de novo para remover', 'Click again to remove'],
  'assoc.fichaNaoEncontrada': ['Ficha não encontrada no Zotero.', 'Card not found in Zotero.'],

  // Desenho
  'des.caneta': ['Caneta', 'Pen'],
  'des.marcador': ['Marcador', 'Highlighter'],
  'des.grifar': ['Grifar texto', 'Highlight text'],
  'des.borracha': ['Borracha', 'Eraser'],
  'des.desfazer': ['Desfazer', 'Undo'],
  'des.desfazerDica': ['Desfazer (Ctrl+Z)', 'Undo (Ctrl+Z)'],
  'des.parar': ['Parar de desenhar', 'Stop drawing'],
  'des.pararDica': ['Parar (Esc)', 'Stop (Esc)'],
  'des.cor': ['Cor', 'Color'],
  'des.corN': ['Cor {c}', 'Color {c}'],
  'des.espessura': ['Espessura', 'Thickness'],
  'des.espessuraN': ['Espessura {e}', 'Thickness: {e}'],
  'des.fina': ['fina', 'thin'],
  'des.media': ['média', 'medium'],
  'des.grossa': ['grossa', 'thick'],
  'des.dicaGrifar': ['Selecione um trecho de uma ficha. Clique num grifo para tirá-lo.', 'Select a passage on a card. Click a highlight to remove it.'],
  'des.barra': ['Desenhar', 'Draw'],

  // Lista
  'lista.ficha.1': ['ficha', 'card'],
  'lista.ficha.n': ['fichas', 'cards'],
  'lista.em': [' em “{nome}”', ' in “{nome}”'],
  'lista.resumo': [
    ' · {p} com problema · {c} coleções · versão da biblioteca {v}',
    ' · {p} with problems · {c} collections · library version {v}',
  ],
  'lista.problemas': ['Fichas com problema', 'Cards with problems'],
  'lista.problemasExplica': [
    'Estas notas têm a tag “ficha”, mas não estão no formato. Corrija no Zotero e use Menu → Buscar novidades no Zotero.',
    'These notes have the “ficha” tag but are not in the format. Fix them in Zotero and use Menu → Check Zotero for updates.',
  ],
  'lista.fichas': ['Fichas', 'Cards'],
  'lista.nenhuma': ['Nenhuma ficha no formato certo aqui.', 'No cards in the right format here.'],
  'lista.colecoes': ['Coleções', 'Collections'],
  'lista.colecoesExplica': [
    'Entre parênteses, quantas fichas há em cada coleção, contando as subcoleções.',
    'In parentheses, how many cards each collection has, counting subcollections.',
  ],
  'lista.desconhecida': ['(coleção desconhecida)', '(unknown collection)'],
  'lista.semTitulo': ['(sem título)', '(no title)'],
  'lista.verTexto': ['Ver o texto da nota', 'Show the note text'],

  // Leitura das fichas (problemas e avisos)
  'int.semFicha': ['Não começa com “FICHA ·”.', 'Does not start with “FICHA ·” (or “CARD ·”).'],
  'int.vazia': ['A nota está vazia.', 'The note is empty.'],
  'int.semAutorAno': ['O título não tem “Autor (ano)”.', 'The title has no “Author (year)”.'],
  'int.repetido': ['O campo “{campo}” aparece mais de uma vez; usei a primeira.', 'The field “{campo}” appears more than once; the first one was used.'],
  'int.solto': ['Texto fora de qualquer campo: “{texto}”.', 'Text outside any field: “{texto}”.'],
  'int.ordem': ['Os campos estão fora da ordem do formato.', 'The fields are out of the format order.'],
  'int.semTese': ['Falta o campo “Tese” (ou está vazio).', 'The “Thesis” field is missing (or empty).'],
  'int.falta': ['Falta o campo “{campo}”.', 'The “{campo}” field is missing.'],
  'int.avulsa': ['É uma nota avulsa, não presa a um item do Zotero.', 'It is a standalone note, not attached to a Zotero item.'],
  'int.semPai': ['Não encontrei o item pai desta nota (talvez esteja na lixeira).', 'The parent item of this note was not found (it may be in the trash).'],
  'rotulo.ref': ['Ref.', 'Ref.'],
  'rotulo.tese': ['Tese', 'Thesis'],
  'rotulo.conceitos': ['Conceitos', 'Concepts'],
  'rotulo.lembrar': ['Para lembrar', 'To remember'],
  'rotulo.dialogos': ['Diálogos', 'Dialogues'],
  'rotulo.uso': ['Uso', 'Use'],
  'rotulo.video': ['Vídeo', 'Video'],
  'rotulo.fichamento': ['Fichamento completo', 'Full notes'],

  // Janelas: comum
  'jan.fechar': ['Fechar', 'Close'],
  'jan.cancelar': ['Cancelar', 'Cancel'],
  'jan.baixado': ['Arquivo baixado (veja a pasta Downloads).', 'File downloaded (see your Downloads folder).'],
  'jan.copiado': ['Texto copiado.', 'Text copied.'],
  'jan.naoCopiou': ['Não consegui copiar; selecione o texto e use Ctrl+C.', 'Could not copy; select the text and press Ctrl+C.'],

  // Tema
  'tema.titulo': ['Tema', 'Theme'],
  'tema.sistema': ['Igual ao sistema', 'Same as system'],
  'tema.claro': ['Claro', 'Light'],
  'tema.escuro': ['Escuro', 'Dark'],
  'tema.coresClaro': ['Cores do tema claro', 'Light theme colors'],
  'tema.coresEscuro': ['Cores do tema escuro', 'Dark theme colors'],
  'tema.dica': ['As cores ficam guardadas separadamente para o tema claro e o escuro.', 'Colors are kept separately for the light and dark themes.'],
  'tema.restaurar': ['Restaurar cores padrão', 'Restore default colors'],
  'tema.pronto': ['Pronto', 'Done'],
  'tema.fundoMesa': ['Fundo da mesa', 'Table background'],
  'tema.fundoFicha': ['Fundo da ficha', 'Card background'],
  'tema.texto': ['Texto', 'Text'],
  'tema.rotulos': ['Nomes dos campos', 'Field names'],
  'tema.associacoes': ['Associações', 'Links'],

  // Exportar
  'exp.titulo': ['Exportar', 'Export'],
  'exp.imagem': ['Imagem da mesa', 'Table image'],
  'exp.imagemExplica': [
    'Gera um PNG com o que está visível na coleção atual: fichas, áreas e associações.',
    'Creates a PNG of what is visible in the current collection: cards, areas and links.',
  ],
  'exp.baixarImagem': ['Baixar imagem', 'Download image'],
  'exp.gerando': ['Gerando imagem…', 'Creating image…'],
  'exp.imagemBaixada': ['Imagem baixada (veja a pasta Downloads).', 'Image downloaded (see your Downloads folder).'],
  'exp.erroImagem': ['Não foi possível gerar a imagem. {e}', 'Could not create the image. {e}'],
  'exp.nadaVisivel': ['Não há nada visível para exportar.', 'There is nothing visible to export.'],
  'exp.resumo': ['Resumo das associações', 'Links summary'],
  'exp.resumoExplica': [
    'Para cada associação: a referência e a tese dos dois textos, a área, a relação e a sua anotação. Serve para revisar, guardar ou colar onde quiser.',
    'For each link: the reference and thesis of both texts, the area, the relation and your note. Useful to review, keep or paste anywhere.',
  ],
  'exp.completas': ['Incluir as fichas completas', 'Include the full cards'],
  'exp.copiar': ['Copiar texto', 'Copy text'],
  'exp.baixarMd': ['Baixar .md', 'Download .md'],
  'exp.claude': ['Fichas para o Claude', 'Cards for Claude'],
  'exp.claudeExplica': [
    'Um arquivo com as fichas visíveis e as associações que já existem, para enviar ao Claude junto com o contexto do seu projeto. Com a skill relacoes-entre-textos, ele sugere relações entre os textos; depois, use Menu → Importar associações para escolher quais colocar na mesa.',
    'A file with the visible cards and existing links, to send to Claude along with your project context. With the relacoes-entre-textos skill, it suggests relations between the texts; then use Menu → Import links to choose which ones to place on the table.',
  ],
  'exp.baixarClaude': ['Baixar fichas para o Claude', 'Download cards for Claude'],
  'exp.copiarCurto': ['Copiar', 'Copy'],

  // Salvar ou abrir
  'arq.titulo': ['Salvar ou abrir mesa', 'Save or open table'],
  'arq.explica': [
    'A mesa já é salva sozinha neste navegador a cada mudança. O arquivo serve para guardar uma cópia, manter versões diferentes ou levar a mesa para outro navegador ou computador. O conteúdo das fichas continua no Zotero; o arquivo guarda a arrumação: posições, cores, áreas, associações com anotações, desenhos e tema.',
    'The table is saved automatically in this browser after every change. The file lets you keep a copy, keep different versions or take the table to another browser or computer. The card contents stay in Zotero; the file keeps the arrangement: positions, colors, areas, links with notes, drawings and theme.',
  ],
  'arq.salvar': ['Salvar mesa em arquivo', 'Save table to a file'],
  'arq.salvarBotao': ['Salvar arquivo da mesa', 'Save table file'],
  'arq.abrir': ['Abrir mesa de um arquivo', 'Open table from a file'],
  'arq.abrirExplica': [
    'Abrir um arquivo substitui a mesa atual. Por segurança, uma cópia da mesa atual fica guardada no navegador, mas se quiser mantê-la à mão, salve-a em arquivo antes.',
    'Opening a file replaces the current table. For safety, a copy of the current table is kept in the browser, but if you want it at hand, save it to a file first.',
  ],
  'arq.substituir': ['Substituir a mesa atual', 'Replace the current table'],
  'arq.lido': [
    'Arquivo lido: {f} fichas posicionadas, {a} áreas, {s} associações.',
    'File read: {f} placed cards, {a} areas, {s} links.',
  ],
  'arq.invalido': ['Este arquivo não é uma mesa salva por este app.', 'This file is not a table saved by this app.'],

  // Importar
  'imp.titulo': ['Importar associações', 'Import links'],
  'imp.explica': [
    'Cole aqui a resposta do Claude (skill relacoes-entre-textos) ou escolha o arquivo que ele gerou. Você escolhe quais associações colocar na mesa; dá para mudar tudo depois.',
    'Paste Claude’s answer here (relacoes-entre-textos skill) or choose the file it created. You choose which links to place on the table; everything can be changed later.',
  ],
  'imp.colar': ['…ou cole a resposta do Claude aqui', '…or paste Claude’s answer here'],
  'imp.semAssoc': ['O texto não traz nenhuma associação.', 'The text contains no links.'],
  'imp.naoAchei': [
    'Não achei as associações no texto. Cole a resposta inteira do Claude (com o bloco que começa com {"formato": "mesa-de-fichas-associacoes" …}).',
    'Could not find the links in the text. Paste Claude’s whole answer (with the block that starts with {"formato": "mesa-de-fichas-associacoes" …}).',
  ],
  'imp.contagem': ['{s} sugestões · {m} marcadas', '{s} suggestions · {m} selected'],
  'imp.marcarTodas': ['Marcar todas', 'Select all'],
  'imp.desmarcarTodas': ['Desmarcar todas', 'Select none'],
  'imp.confianca': [' · confiança {c}', ' · confidence {c}'],
  'imp.naoEncontrada': ['Ficha não encontrada: {k}', 'Card not found: {k}'],
  'imp.repetida': ['Já existe uma associação entre essas fichas.', 'There is already a link between these cards.'],
  'imp.colocarN': ['Colocar {n} na mesa', 'Place {n} on the table'],
  'imp.colocar': ['Colocar na mesa', 'Place on the table'],

  // Textos exportados (Markdown)
  'md.resumoTitulo': ['# Associações entre textos ({col})', '# Links between texts ({col})'],
  'md.todas': ['todas as coleções', 'all collections'],
  'md.resumoIntro': [
    'Exportado do {app} em {data}. Cada item liga dois textos: a relação e a anotação foram escritas pelo pesquisador; os resumos vêm das fichas de leitura, com páginas entre colchetes ([p. ?] = página a conferir).',
    'Exported from {app} on {data}. Each item links two texts: the relation and the note were written by the researcher; the summaries come from the reading cards, with pages in brackets ([p. ?] = page to check).',
  ],
  'md.referencia': ['Referência', 'Reference'],
  'md.tese': ['Tese', 'Thesis'],
  'md.conceitos': ['Conceitos', 'Concepts'],
  'md.lembrar': ['Para lembrar', 'To remember'],
  'md.dialogos': ['Diálogos', 'Dialogues'],
  'md.usos': ['Uso no projeto', 'Use in the project'],
  'md.area': ['Área na mesa', 'Area on the table'],
  'md.colecoes': ['Coleções', 'Collections'],
  'md.textoA': ['Texto A', 'Text A'],
  'md.textoB': ['Texto B', 'Text B'],
  'md.relacao': ['Relação', 'Relation'],
  'md.anotacao': ['Anotação', 'Note'],
  'md.aDefinir': ['(relação a definir)', '(relation to define)'],
  'md.semAnotacao': ['(sem anotação)', '(no note)'],
  'md.nenhuma': ['Nenhuma associação nesta coleção.', 'No links in this collection.'],
  'md.claudeTitulo': ['# Fichas para o Claude — {app}', '# Cards for Claude — {app}'],
  'md.claudeLinha': ['Coleção: {col} · {n} fichas · exportado em {data}', 'Collection: {col} · {n} cards · exported on {data}'],
  'md.claudeIntro': [
    'Use com a skill "relacoes-entre-textos". Cada ficha tem um identificador entre colchetes, como [ABCD1234]; as associações sugeridas devem usar esses identificadores para que o Cordatril as coloque nas fichas certas.',
    'Use with the "relacoes-entre-textos" skill. Each card has an identifier in brackets, like [ABCD1234]; suggested links must use these identifiers so the app places them on the right cards.',
  ],
  'md.fichas': ['## Fichas', '## Cards'],
  'md.existentes': ['## Associações que já existem', '## Existing links'],
  'md.nenhumaAinda': ['Nenhuma ainda.', 'None yet.'],
} as const satisfies Record<string, readonly [string, string]>

export type Chave = keyof typeof TEXTOS

/** Texto no idioma atual, com {nome} trocado pelos valores dados. */
export function t(chave: Chave, valores: Record<string, string | number> = {}): string {
  const par = TEXTOS[chave]
  let texto: string = idioma === 'en' ? par[1] : par[0]
  for (const [k, v] of Object.entries(valores)) texto = texto.split(`{${k}}`).join(String(v))
  return texto
}

/** Singular ou plural: usa a chave "<base>.1" quando n = 1 e "<base>.n" nos outros casos. */
export function tn(base: string, n: number, valores: Record<string, string | number> = {}): string {
  return t(`${base}.${n === 1 ? '1' : 'n'}` as Chave, { n, ...valores })
}

/** Data no formato do idioma (ex.: 05/11/2026 ou 11/5/2026). */
export const data = (d: Date = new Date()) => d.toLocaleDateString(idioma)

/** Comparação de textos para ordenar (com acentos), no idioma atual. */
export const comparar = (a: string, b: string) => a.localeCompare(b, idioma)
