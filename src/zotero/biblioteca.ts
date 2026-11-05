// Carrega do Zotero as coleções e as notas com a tag "ficha", e interpreta cada nota.

import { buscarTodos } from './api.ts'
import { htmlParaTexto } from '../fichas/texto.ts'
import { interpretarFicha, type CamposFicha } from '../fichas/interpretar.ts'

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
}

export async function carregarBiblioteca(): Promise<Biblioteca> {
  const usuario = `/users/${encodeURIComponent(__ZOTERO_USER_ID__)}`

  const [cols, notas] = await Promise.all([
    buscarTodos<ColecaoApi>(`${usuario}/collections`),
    buscarTodos<NotaApi>(`${usuario}/items?itemType=note&tag=ficha`),
  ])

  // Notas filhas não ficam em coleções: as coleções estão no item pai.
  const chavesPais = [...new Set(notas.itens.map((n) => n.data.parentItem).filter((k): k is string => !!k))]
  const pais = new Map<string, ItemApi>()
  let versao = Math.max(cols.versao, notas.versao)
  for (let i = 0; i < chavesPais.length; i += 50) {
    const lote = await buscarTodos<ItemApi>(`${usuario}/items?itemKey=${chavesPais.slice(i, i + 50).join(',')}`)
    lote.itens.forEach((p) => pais.set(p.key, p))
    versao = Math.max(versao, lote.versao)
  }

  const fichas: Ficha[] = []
  const problemas: FichaComProblema[] = []
  for (const nota of notas.itens) {
    const chavePai = nota.data.parentItem ?? null
    const pai = chavePai ? pais.get(chavePai) : undefined
    const origem: Origem = {
      chave: nota.key,
      versao: nota.version,
      chavePai,
      colecoes: (chavePai ? pai?.data.collections : nota.data.collections) ?? [],
    }
    const texto = htmlParaTexto(nota.data.note)
    const r = interpretarFicha(texto)
    if (r.ok) {
      const avisos = [...r.avisos]
      if (!chavePai) avisos.push('É uma nota avulsa, não presa a um item do Zotero.')
      else if (!pai) avisos.push('Não encontrei o item pai desta nota (talvez esteja na lixeira).')
      fichas.push({ ...origem, ...r.campos, avisos })
    } else {
      problemas.push({ ...origem, titulo: r.titulo, motivos: r.motivos, texto })
    }
  }

  const colecoes = cols.itens
    .map((c) => ({ chave: c.key, nome: c.data.name, pai: c.data.parentCollection || null }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  return { versao, colecoes, fichas, problemas }
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
