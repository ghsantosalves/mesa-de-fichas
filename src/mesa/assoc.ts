// Associações entre fichas: cada uma é uma "aresta" do React Flow, da ficha A para a B.
// As operações mudam ao mesmo tempo a tela e o estado salvo.

import type { Edge, ReactFlowInstance } from '@xyflow/react'
import { alterarMesa, type Associacao } from '../estado/mesa.ts'
import type { NoMesa } from './operacoes.ts'

export type DadosAresta = { assoc: Associacao }
export type ArestaAssoc = Edge<DadosAresta, 'assoc'>
type Mesa = ReactFlowInstance<NoMesa, ArestaAssoc>

export const RELACOES_PADRAO = ['apoia-se em', 'critica', 'amplia', 'dialoga com', 'contrasta com']
export const LARGURA_MIN_CAIXA = 130
export const ALTURA_MIN_CAIXA = 48

export function arestaDe(a: Associacao): ArestaAssoc {
  return { id: a.id, source: a.a, target: a.b, type: 'assoc', data: { assoc: a }, selectable: false, focusable: false }
}

export function criarAssociacao(rf: Mesa, a: string, b: string): string {
  const assoc: Associacao = { id: crypto.randomUUID().slice(0, 8), a, b, rel: '', nota: '' }
  rf.setEdges((es) => [...es, arestaDe(assoc)])
  alterarMesa((e) => {
    e.associacoes.push(assoc)
  })
  return assoc.id
}

type Mudanca = Partial<Omit<Associacao, 'id'>>
type Caixa = 'dx' | 'dy' | 'w' | 'h'

/** Muda campos de uma associação; `tirar` apaga deslocamento/tamanho da caixa. */
export function mudarAssociacao(rf: Mesa, id: string, m: Mudanca, tirar: Caixa[] = []) {
  const aplicar = (x: Associacao): Associacao => {
    const n: Associacao = { ...x, ...m }
    for (const k of ['dx', 'dy', 'w', 'h'] as const) if (n[k] !== undefined) n[k] = Math.round(n[k]!)
    for (const k of tirar) delete n[k]
    return n
  }
  rf.setEdges((es) => es.map((e) => (e.id === id && e.data ? arestaDe(aplicar(e.data.assoc)) : e)))
  alterarMesa((e) => {
    const i = e.associacoes.findIndex((x) => x.id === id)
    if (i >= 0) e.associacoes[i] = aplicar(e.associacoes[i])
  })
}

export function inverterAssociacao(rf: Mesa, assoc: Associacao) {
  mudarAssociacao(rf, assoc.id, { a: assoc.b, b: assoc.a })
}

export function removerAssociacao(rf: Mesa, id: string) {
  rf.setEdges((es) => es.filter((e) => e.id !== id))
  alterarMesa((e) => {
    e.associacoes = e.associacoes.filter((x) => x.id !== id)
  })
}
