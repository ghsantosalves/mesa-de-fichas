// Estado da mesa (só do app, nunca vai para o Zotero): posição de cada ficha,
// vista (posição e zoom) e coleção escolhida. Fica salvo no navegador e é
// gravado sozinho pouco depois de cada mudança.

import { useSyncExternalStore } from 'react'

const CHAVE = 'mesa-de-fichas:mesa'
const ATRASO_MS = 700

export type Posicao = { x: number; y: number }
export type Vista = { x: number; y: number; zoom: number }
export const LARGURA_MIN_AREA = 240
export const ALTURA_MIN_AREA = 160
export const CORES = ['amarelo', 'azul', 'verde', 'rosa', 'cinza'] as const
export type Cor = (typeof CORES)[number]
/** Campos que podem ser ocultados em cada ficha (o título sempre aparece). */
export const CAMPOS = ['tese', 'conceitos', 'lembrar', 'dialogos', 'usos', 'ref', 'colecoes'] as const
export type Campo = (typeof CAMPOS)[number]
export const NOMES_CAMPOS: Record<Campo, string> = {
  tese: 'Tese',
  conceitos: 'Conceitos',
  lembrar: 'Para lembrar',
  dialogos: 'Diálogos',
  usos: 'Uso no projeto',
  ref: 'Referência',
  colecoes: 'Coleções',
}
export type EstadoFicha = Posicao & { cor?: Cor; recolhida?: boolean; ocultos?: Campo[] }
/** Área da mesa. `colecao` é a coleção em que foi criada ('*' = aparece em todas). */
export type Area = { id: string; x: number; y: number; w: number; h: number; titulo: string; colecao: string }
export type EstadoMesa = {
  versao: 1
  /** Por chave da nota no Zotero. Fichas que sumiram do Zotero continuam aqui. */
  fichas: Record<string, EstadoFicha>
  areas: Area[]
  vista: Vista | null
  colecao: string
}

export type Situacao =
  | { tipo: 'nova' }
  | { tipo: 'salvo' }
  | { tipo: 'pendente' }
  | { tipo: 'erro'; motivo: string }
  | { tipo: 'recuperado'; copia: string }

const numero = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao)

function vazio(): EstadoMesa {
  return { versao: 1, fichas: {}, areas: [], vista: null, colecao: '*' }
}

/** Confere o que veio do armazenamento, aproveitando o que estiver certo. */
function validar(d: unknown): EstadoMesa {
  if (!d || typeof d !== 'object') throw new Error('formato desconhecido')
  const o = d as Record<string, unknown>
  const e = vazio()
  if (o.fichas && typeof o.fichas === 'object') {
    for (const [k, p] of Object.entries(o.fichas as Record<string, unknown>)) {
      const q = p as Record<string, unknown> | null
      if (!q || typeof q !== 'object') continue
      const f: EstadoFicha = { x: numero(q.x, 0), y: numero(q.y, 0) }
      if (CORES.includes(q.cor as Cor)) f.cor = q.cor as Cor
      if (q.recolhida === true) f.recolhida = true
      if (Array.isArray(q.ocultos)) {
        const ocultos = CAMPOS.filter((c) => (q.ocultos as unknown[]).includes(c))
        if (ocultos.length) f.ocultos = ocultos
      }
      e.fichas[k] = f
    }
  }
  if (Array.isArray(o.areas)) {
    for (const a of o.areas as Record<string, unknown>[]) {
      if (!a || typeof a !== 'object' || typeof a.id !== 'string') continue
      e.areas.push({
        id: a.id,
        x: numero(a.x, 0),
        y: numero(a.y, 0),
        w: Math.max(LARGURA_MIN_AREA, numero(a.w, 600)),
        h: Math.max(ALTURA_MIN_AREA, numero(a.h, 400)),
        titulo: typeof a.titulo === 'string' ? a.titulo : 'Área',
        colecao: typeof a.colecao === 'string' ? a.colecao : '*',
      })
    }
  }
  const v = o.vista as Record<string, unknown> | null
  if (v && typeof v === 'object') e.vista = { x: numero(v.x, 0), y: numero(v.y, 0), zoom: numero(v.zoom, 1) }
  if (typeof o.colecao === 'string') e.colecao = o.colecao
  return e
}

function ler(): { estado: EstadoMesa; situacao: Situacao } {
  let texto: string | null
  try {
    texto = localStorage.getItem(CHAVE)
  } catch {
    return { estado: vazio(), situacao: { tipo: 'erro', motivo: 'O navegador não deixa salvar a mesa.' } }
  }
  if (texto === null) return { estado: vazio(), situacao: { tipo: 'nova' } }
  try {
    return { estado: validar(JSON.parse(texto)), situacao: { tipo: 'salvo' } }
  } catch {
    // Nunca jogar fora em silêncio: guarda uma cópia do que estava lá antes de recomeçar.
    const copia = `${CHAVE}:copia-${new Date().toISOString()}`
    try {
      localStorage.setItem(copia, texto)
    } catch {
      /* sem espaço para a cópia; segue mesmo assim */
    }
    return { estado: vazio(), situacao: { tipo: 'recuperado', copia } }
  }
}

const inicial = ler()
/** O estado atual da mesa. Para mudar, use `alterarMesa`. */
export const mesa: EstadoMesa = inicial.estado
let situacao: Situacao = inicial.situacao
let temporizador: ReturnType<typeof setTimeout> | null = null
const ouvintes = new Set<() => void>()

function avisar(s: Situacao) {
  situacao = s
  ouvintes.forEach((f) => f())
}

function gravar() {
  if (temporizador) clearTimeout(temporizador)
  temporizador = null
  try {
    localStorage.setItem(CHAVE, JSON.stringify(mesa))
    avisar({ tipo: 'salvo' })
  } catch {
    avisar({ tipo: 'erro', motivo: 'Não foi possível salvar a mesa neste navegador.' })
  }
}

/** Muda o estado e agenda a gravação. */
export function alterarMesa(mudar: (e: EstadoMesa) => void) {
  mudar(mesa)
  if (temporizador) clearTimeout(temporizador)
  temporizador = setTimeout(gravar, ATRASO_MS)
  if (situacao.tipo !== 'pendente') avisar({ tipo: 'pendente' })
}

// Ao fechar ou recarregar a página, grava na hora o que estiver pendente.
addEventListener('pagehide', () => {
  if (temporizador) gravar()
})

export function useSituacao(): Situacao {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => situacao,
  )
}

export const arredondar = (p: Posicao): Posicao => ({ x: Math.round(p.x), y: Math.round(p.y) })

/** Muda a posição de uma ficha sem perder a cor e o recolhimento. */
export function posicionarFicha(e: EstadoMesa, chave: string, p: Posicao) {
  e.fichas[chave] = { ...e.fichas[chave], ...arredondar(p) }
}
