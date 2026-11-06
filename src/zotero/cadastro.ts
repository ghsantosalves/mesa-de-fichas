// Cadastro de ficha: escolhe um texto do Zotero, monta a ficha já com o que o Zotero
// sabe dele (autor, ano, título, referência ABNT) e cria a nota filha com a tag "ficha".
//
// Esta é a ÚNICA escrita que o app faz no Zotero: criar uma nota nova, presa a um texto
// escolhido pelo usuário. Nada existente é alterado nem apagado. Exige uma chave com
// permissão de escrita ("Allow write access"); com chave só de leitura, o app avisa.

import { buscarJson, buscarTodos, caminhoUsuario, enviarJson, ErroZotero } from './api.ts'
import { idioma, t } from '../i18n.ts'

type Autor = { creatorType: string; firstName?: string; lastName?: string; name?: string }
/** Texto (item do Zotero que não é anexo nem nota), com os campos usados aqui. */
export type TextoZotero = {
  key: string
  data: {
    itemType: string
    title?: string
    creators?: Autor[]
    date?: string
    publisher?: string
    place?: string
    publicationTitle?: string
    bookTitle?: string
    websiteTitle?: string
    university?: string
    thesisType?: string
    edition?: string
    volume?: string
    issue?: string
    pages?: string
    url?: string
    collections?: string[]
  }
}

const NAO_TEXTO = new Set(['attachment', 'note', 'annotation'])
const limpar = (s?: string) => (s ?? '').trim()

/** Textos de uma coleção ou, em "Todas as coleções", os que respondem à busca. */
export async function listarTextos(colecao: string, busca: string): Promise<TextoZotero[]> {
  const usuario = caminhoUsuario()
  let itens: TextoZotero[]
  if (colecao === '*') {
    if (busca.trim().length < 2) return []
    const q = encodeURIComponent(busca.trim())
    itens = (await buscarJson<TextoZotero[]>(`${usuario}/items/top?q=${q}&qmode=titleCreatorYear&limit=50`)).dados
  } else {
    itens = (await buscarTodos<TextoZotero>(`${usuario}/collections/${colecao}/items/top`)).itens
  }
  return itens
    .filter((i) => !NAO_TEXTO.has(i.data.itemType))
    .sort((a, b) => autorAno(a).localeCompare(autorAno(b), idioma === 'en' ? 'en' : 'pt-BR'))
}

/** A chave atual pode escrever na biblioteca? */
export async function podeEscrever(): Promise<boolean> {
  const { dados } = await buscarJson<{ access?: { user?: { write?: boolean } } }>('/keys/current')
  return !!dados.access?.user?.write
}

// --- Autor, ano e referência ---

const ano = (i: TextoZotero) => limpar(i.data.date).match(/\d{4}/)?.[0] ?? ''
const autores = (i: TextoZotero, tipo = 'author') => {
  const lista = (i.data.creators ?? []).filter((c) => c.creatorType === tipo)
  // Sem "author" (ex.: só organizadores), usa os primeiros que houver.
  return lista.length || tipo !== 'author' ? lista : (i.data.creators ?? []).slice(0, 3)
}
const sobrenome = (c: Autor) => limpar(c.lastName) || limpar(c.name)

/** "Autor (ano)", como na primeira linha da ficha: Certeau (1982), Paul e Ricoeur (2016), Koselleck et al. (2013). */
export function autorAno(i: TextoZotero): string {
  const nomes = autores(i).map(sobrenome).filter(Boolean)
  const e = idioma === 'en' ? 'and' : 'e'
  const quem =
    nomes.length === 0
      ? t('nova.semAutor')
      : nomes.length === 1
        ? nomes[0]
        : nomes.length === 2
          ? `${nomes[0]} ${e} ${nomes[1]}`
          : `${nomes[0]} et al.`
  return `${quem} (${ano(i) || 's.d.'})`
}

/** Nome no padrão da ABNT: SOBRENOME, Nome. */
const nomeABNT = (c: Autor) =>
  limpar(c.name) ? limpar(c.name).toUpperCase() : [limpar(c.lastName).toUpperCase(), limpar(c.firstName)].filter(Boolean).join(', ')
const listaABNT = (lista: Autor[]) =>
  lista.length > 3 ? `${nomeABNT(lista[0])} et al.` : lista.map(nomeABNT).filter(Boolean).join('; ')

/** Referência no padrão ABNT, montada com os dados do Zotero (dá para corrigir no formulário). */
export function referenciaABNT(i: TextoZotero): string {
  const d = i.data
  const quem = listaABNT(autores(i))
  const a = ano(i) || '[s.d.]'
  const local = limpar(d.place) || '[S. l.]'
  const editora = limpar(d.publisher) || '[s. n.]'
  const titulo = limpar(d.title)
  const partes: string[] = []
  switch (d.itemType) {
    case 'book':
      partes.push(`${quem}. ${titulo}.`, d.edition ? `${limpar(d.edition)} ed.` : '', `${local}: ${editora}, ${a}.`)
      break
    case 'bookSection': {
      const org = listaABNT(autores(i, 'editor'))
      partes.push(
        `${quem}. ${titulo}. In:`,
        org ? `${org} (org.).` : '',
        `${limpar(d.bookTitle)}.`,
        `${local}: ${editora}, ${a}.`,
        d.pages ? `p. ${limpar(d.pages)}.` : '',
      )
      break
    }
    case 'journalArticle':
    case 'magazineArticle':
    case 'newspaperArticle': {
      const detalhes = [
        limpar(d.publicationTitle),
        limpar(d.place),
        d.volume ? `v. ${limpar(d.volume)}` : '',
        d.issue ? `n. ${limpar(d.issue)}` : '',
        d.pages ? `p. ${limpar(d.pages)}` : '',
        a,
      ].filter(Boolean)
      partes.push(`${quem}. ${titulo}.`, `${detalhes.join(', ')}.`)
      break
    }
    case 'thesis': {
      const tipo = limpar(d.thesisType) || (idioma === 'en' ? 'Thesis' : 'Tese')
      const onde = [limpar(d.university) || limpar(d.publisher), limpar(d.place), a].filter(Boolean).join(', ')
      partes.push(`${quem}. ${titulo}.`, `${a}.`, `${tipo} – ${onde}.`)
      break
    }
    default: {
      const fonte = limpar(d.publicationTitle) || limpar(d.websiteTitle) || limpar(d.publisher)
      partes.push(`${quem}. ${titulo}.`, fonte ? `${fonte}, ${a}.` : `${a}.`)
      if (d.url) partes.push(`${idioma === 'en' ? 'Available at' : 'Disponível em'}: ${limpar(d.url)}.`)
    }
  }
  return partes
    .filter(Boolean)
    .join(' ')
    .replace(/^\. /, '')
    .replace(/\.\./g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}

// --- Texto da ficha e nota ---

export type CamposNovaFicha = {
  cabecalho: string
  ref: string
  tese: string
  conceitos: string
  lembrar: string
  dialogos: string
  uso: string
  video: string
  fichamento: string
}

/** Texto da ficha no formato fixo (rótulos no idioma da interface; o app lê os dois). */
export function textoDaFicha(c: CamposNovaFicha): string {
  const v = (s: string) => limpar(s) || '—'
  const r = idioma === 'en'
    ? ['CARD', 'Ref.', 'Thesis', 'Concepts', 'To remember', 'Dialogues', 'Use', 'Video', 'Full notes']
    : ['FICHA', 'Ref.', 'Tese', 'Conceitos', 'Para lembrar', 'Diálogos', 'Uso', 'Vídeo', 'Fichamento completo']
  return [
    `${r[0]} · ${limpar(c.cabecalho)}`,
    `${r[1]}: ${v(c.ref)}`,
    '',
    `${r[2]}: ${v(c.tese)}`,
    '',
    `${r[3]}: ${v(c.conceitos)}`,
    '',
    `${r[4]}: ${v(c.lembrar)}`,
    '',
    `${r[5]}: ${v(c.dialogos)}`,
    '',
    `${r[6]}: ${v(c.uso)}`,
    `${r[7]}: ${v(c.video)}`,
    `${r[8]}: ${v(c.fichamento)}`,
  ].join('\n')
}

/**
 * Página(s) no formato da ficha: "66", "66-77" ou "85, 89" viram "[p. 66]" etc.
 * (aceita "p. 66" e tira o "p."). Sem número, devolve ''.
 */
export const marcaDePaginas = (s: string) => {
  const limpo = s
    .trim()
    .replace(/^p(?:ág|ag|p)?\.?\s*/i, '')
    .trim()
  return limpo ? `[p. ${limpo}]` : ''
}

/** "conceito [p. 66]" (ou só o conceito, sem página). */
export const conceitoComPaginas = (conceito: string, pags: string) =>
  conceito.trim() ? [conceito.trim(), marcaDePaginas(pags)].filter(Boolean).join(' ') : ''

/** "Autor (relação)" (ou só o autor, sem relação). */
export const autorComRelacao = (autor: string, rel: string) =>
  autor.trim() ? (rel.trim() ? `${autor.trim()} (${rel.trim()})` : autor.trim()) : ''

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** HTML da nota: um parágrafo por linha (as linhas em branco separam os blocos). */
const htmlDaNota = (texto: string) =>
  texto
    .split('\n')
    .map((linha) => (linha.trim() ? `<p>${escapar(linha)}</p>` : '<p></p>'))
    .join('\n')

/** Cria a nota filha com a tag "ficha" no texto `chavePai`. Devolve a chave da nota nova. */
export async function criarNotaFilha(chavePai: string, texto: string): Promise<string> {
  // A "senha de escrita" evita criar a mesma nota duas vezes se o pedido for repetido.
  const token = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')
  type Resposta = { success?: Record<string, string>; failed?: Record<string, { message?: string }> }
  const r = await enviarJson<Resposta>(
    `${caminhoUsuario()}/items`,
    [{ itemType: 'note', parentItem: chavePai, note: htmlDaNota(texto), tags: [{ tag: 'ficha' }], collections: [], relations: {} }],
    { 'Zotero-Write-Token': token },
  )
  const chave = r.success?.['0']
  if (!chave) throw new ErroZotero(t('nova.falhou', { motivo: r.failed?.['0']?.message ?? '' }))
  return chave
}
