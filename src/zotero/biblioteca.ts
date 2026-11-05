// Carrega do Zotero as coleções e as notas com a tag "ficha", e interpreta cada nota.
//
// Sincronização incremental: o que já foi baixado fica guardado no navegador com a
// versão da biblioteca. Nas próximas vezes, só é pedido ao Zotero o que mudou depois
// dessa versão (`since=`), mais a lista de chaves atuais (para saber o que sumiu).

import { buscarJson, buscarTexto, buscarTodos, caminhoUsuario } from './api.ts'
import { lerCredenciais } from './credenciais.ts'
import { htmlParaTexto } from '../fichas/texto.ts'
import { interpretarFicha, type CamposFicha } from '../fichas/interpretar.ts'
import { comparar, t } from '../i18n.ts'

const CHAVE_COPIA = 'mesa-de-fichas:copia-zotero'

// Formatos da API (só os campos usados), conferidos com respostas reais.
type ColecaoApi = { key: string; data: { name: string; parentCollection: string | false } }
type NotaApi = {
  key: string
  version: number
  data: { note: string; parentItem?: string; collections?: string[] }
}
type ItemApi = { key: string; data: { collections?: string[]; title?: string } }

export type Colecao = { chave: string; nome: string; pai: string | null }

type Origem = {
  /** Chave da nota no Zotero: o identificador da ficha. */
  chave: string
  versao: number
  /** Chave do item pai (o texto lido); null se a nota for avulsa. */
  chavePai: string | null
  /** Chaves das coleções do item pai (ou da própria nota, se avulsa). */
  colecoes: string[]
}

export type Ficha = Origem & CamposFicha & { avisos: string[] }
export type FichaComProblema = Origem & { titulo: string; motivos: string[]; texto: string }

export type Biblioteca = {
  versao: number
  colecoes: Colecao[]
  fichas: Ficha[]
  problemas: FichaComProblema[]
  /** Fichas que sumiram do Zotero nesta leitura (com o último conteúdo conhecido). */
  sumiram: Ficha[]
  /** Quantas notas foram baixadas nesta leitura (0 = nada mudou no Zotero). */
  baixadas: number
}

/** Cópia local do que já foi baixado do Zotero. */
type Copia = {
  usuario: string
  versao: number
  notas: Record<string, NotaApi>
  pais: Record<string, ItemApi>
}

function lerCopia(usuario: string): Copia | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE_COPIA) ?? 'null') as Copia | null
    return c && c.usuario === usuario && c.versao > 0 && c.notas && c.pais ? c : null
  } catch {
    return null
  }
}

function gravarCopia(c: Copia) {
  try {
    localStorage.setItem(CHAVE_COPIA, JSON.stringify(c))
  } catch {
    // Sem espaço: na próxima vez baixa tudo de novo. Não é grave.
  }
}

/** Busca itens pela chave, de 50 em 50 (limite da API). */
async function porChave<T>(usuario: string, chaves: string[]): Promise<{ itens: T[]; versao: number }> {
  const itens: T[] = []
  let versao = 0
  for (let i = 0; i < chaves.length; i += 50) {
    const lote = await buscarTodos<T>(`${usuario}/items?itemKey=${chaves.slice(i, i + 50).join(',')}`)
    itens.push(...lote.itens)
    versao = Math.max(versao, lote.versao)
  }
  return { itens, versao }
}

/** Só os campos usados, para a cópia local ficar pequena. */
const enxugarNota = (n: NotaApi): NotaApi => ({
  key: n.key,
  version: n.version,
  data: { note: n.data.note, parentItem: n.data.parentItem, collections: n.data.collections },
})
const enxugarPai = (p: ItemApi): ItemApi => ({ key: p.key, data: { collections: p.data.collections } })

/**
 * Lê a biblioteca. Usa a cópia local e pede só o que mudou; com `completa`,
 * ignora a cópia e baixa tudo de novo.
 */
export async function carregarBiblioteca(completa = false): Promise<Biblioteca> {
  const usuario = caminhoUsuario()
  const copia = completa ? null : lerCopia(lerCredenciais()?.userId ?? '')

  // Coleções: são poucas; vêm sempre inteiras.
  const cols = await buscarTodos<ColecaoApi>(`${usuario}/collections`)
  let versao = cols.versao
  const notas: Record<string, NotaApi> = { ...copia?.notas }
  const pais: Record<string, ItemApi> = { ...copia?.pais }
  const sumiramNotas: NotaApi[] = []
  let baixadas = 0

  if (copia) {
    // 1. Quais fichas existem agora (uma lista curta, num pedido só).
    const chaves = await buscarTexto(`${usuario}/items?itemType=note&tag=ficha&format=keys`)
    const atuais = new Set(chaves.texto.split('\n').map((s) => s.trim()).filter(Boolean))
    versao = Math.max(versao, chaves.versao)
    // 2. As que mudaram desde a última leitura.
    const mudadas = await buscarTodos<NotaApi>(`${usuario}/items?itemType=note&tag=ficha&since=${copia.versao}`)
    mudadas.itens.forEach((n) => (notas[n.key] = enxugarNota(n)))
    baixadas += mudadas.itens.length
    versao = Math.max(versao, mudadas.versao)
    // 3. As que existem mas não estão na cópia (por segurança).
    const faltam = [...atuais].filter((k) => !notas[k])
    if (faltam.length) {
      const r = await porChave<NotaApi>(usuario, faltam)
      r.itens.forEach((n) => (notas[n.key] = enxugarNota(n)))
      baixadas += r.itens.length
    }
    // 4. As que sumiram (apagadas, na lixeira ou sem a tag "ficha").
    for (const k of Object.keys(notas)) {
      if (!atuais.has(k)) {
        sumiramNotas.push(notas[k])
        delete notas[k]
      }
    }
    // 5. Itens pais que mudaram (as coleções podem ter mudado).
    const versoes = await buscarJson<Record<string, number>>(`${usuario}/items?since=${copia.versao}&format=versions`)
    versao = Math.max(versao, versoes.versao)
    const precisa = new Set(Object.values(notas).map((n) => n.data.parentItem).filter((k): k is string => !!k))
    const paisParaBaixar = [...precisa].filter((k) => !pais[k] || k in versoes.dados)
    if (paisParaBaixar.length) {
      const r = await porChave<ItemApi>(usuario, paisParaBaixar)
      r.itens.forEach((p) => (pais[p.key] = enxugarPai(p)))
    }
    for (const k of Object.keys(pais)) if (!precisa.has(k)) delete pais[k]
  } else {
    // Primeira vez (ou leitura completa): baixa tudo.
    const todas = await buscarTodos<NotaApi>(`${usuario}/items?itemType=note&tag=ficha`)
    todas.itens.forEach((n) => (notas[n.key] = enxugarNota(n)))
    baixadas = todas.itens.length
    versao = Math.max(versao, todas.versao)
    // Notas filhas não ficam em coleções: as coleções estão no item pai.
    const chavesPais = [...new Set(todas.itens.map((n) => n.data.parentItem).filter((k): k is string => !!k))]
    const r = await porChave<ItemApi>(usuario, chavesPais)
    r.itens.forEach((p) => (pais[p.key] = enxugarPai(p)))
    versao = Math.max(versao, r.versao)
  }

  gravarCopia({ usuario: lerCredenciais()?.userId ?? '', versao, notas, pais })

  const fichas: Ficha[] = []
  const problemas: FichaComProblema[] = []
  for (const nota of Object.values(notas)) {
    const r = interpretarNota(nota, pais)
    if ('motivos' in r) problemas.push(r)
    else fichas.push(r)
  }
  // Das que sumiram, guarda o último conteúdo das que eram fichas válidas.
  const sumiram = sumiramNotas.map((n) => interpretarNota(n, pais)).filter((r): r is Ficha => !('motivos' in r))

  const colecoes = cols.itens
    .map((c) => ({ chave: c.key, nome: c.data.name, pai: c.data.parentCollection || null }))
    .sort((a, b) => comparar(a.nome, b.nome))

  return { versao, colecoes, fichas, problemas, sumiram, baixadas }
}

function interpretarNota(nota: NotaApi, pais: Record<string, ItemApi>): Ficha | FichaComProblema {
  const chavePai = nota.data.parentItem ?? null
  const pai = chavePai ? pais[chavePai] : undefined
  const origem: Origem = {
    chave: nota.key,
    versao: nota.version,
    chavePai,
    colecoes: (chavePai ? pai?.data.collections : nota.data.collections) ?? [],
  }
  const texto = htmlParaTexto(nota.data.note)
  const r = interpretarFicha(texto)
  if (!r.ok) return { ...origem, titulo: r.titulo, motivos: r.motivos, texto }
  const avisos = [...r.avisos]
  if (!chavePai) avisos.push(t('int.avulsa'))
  else if (!pai) avisos.push(t('int.semPai'))
  return { ...origem, ...r.campos, avisos }
}

/** Esquece a cópia local (por exemplo, ao trocar de conta). */
export function esquecerCopiaZotero() {
  localStorage.removeItem(CHAVE_COPIA)
}

/** Chaves de uma coleção e de todas as suas subcoleções. */
export function comSubcolecoes(chave: string, colecoes: Colecao[]): Set<string> {
  const resultado = new Set([chave])
  for (let mudou = true; mudou; ) {
    mudou = false
    for (const c of colecoes) {
      if (c.pai && resultado.has(c.pai) && !resultado.has(c.chave)) {
        resultado.add(c.chave)
        mudou = true
      }
    }
  }
  return resultado
}

/** Endereço que abre o item no Zotero instalado no computador. */
export const linkZotero = (f: Origem) => `zotero://select/library/items/${f.chavePai ?? f.chave}`
