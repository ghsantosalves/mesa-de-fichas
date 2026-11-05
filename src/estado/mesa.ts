// Estado da mesa (só do app, nunca vai para o Zotero): posição de cada ficha,
// vista (posição e zoom) e coleção escolhida. Fica salvo no navegador e é
// gravado sozinho pouco depois de cada mudança.

import { useSyncExternalStore } from 'react'

const CHAVE = 'mesa-de-fichas:mesa'
const ATRASO_MS = 700

export type Posicao = { x: number; y: number }
export type Vista = { x: number; y: number; zoom: number }
export type EstadoMesa = {
  versao: 1
  /** Por chave da nota no Zotero. Fichas que sumiram do Zotero continuam aqui. */
  fichas: Record<string, Posicao>
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
  return { versao: 1, fichas: {}, vista: null, colecao: '*' }
}

/** Confere o que veio do armazenamento, aproveitando o que estiver certo. */
function validar(d: unknown): EstadoMesa {
  if (!d || typeof d !== 'object') throw new Error('formato desconhecido')
  const o = d as Record<string, unknown>
  const e = vazio()
  if (o.fichas && typeof o.fichas === 'object') {
    for (const [k, p] of Object.entries(o.fichas as Record<string, unknown>)) {
      const q = p as Record<string, unknown> | null
      if (q && typeof q === 'object') e.fichas[k] = { x: numero(q.x, 0), y: numero(q.y, 0) }
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
