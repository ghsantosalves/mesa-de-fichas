// Recorte: mostra só um texto (no centro) e os textos ligados a ele (em volta), com a
// caixa de cada associação no meio da seta. Clicar num vizinho (ou Enter) o leva para o
// centro, e assim se caminha de texto em texto pelas relações.
// O recorte é só uma forma de ver: as posições usadas aqui não são salvas, e ao sair a
// mesa volta exatamente como estava.

import type { ReactFlowInstance } from '@xyflow/react'
import { associacaoNaColecao, mesa, type Associacao } from '../estado/mesa.ts'
import type { NoMesa } from './operacoes.ts'
import { tamanhoDaCaixa, tamanhoDaFicha } from './mapa.ts'
import { chaveRelacao } from './relacoes.ts'

type Mesa = ReactFlowInstance<NoMesa>

/** Prefixo dos itens do recorte que são caixas de associação (os outros são fichas). */
export const CAIXA = 'caixa:'

/** Associações do centro que aparecem no recorte (da coleção atual, não escondidas pela legenda). */
export function associacoesDoCentro(centro: string, ocultas: string[], naMesa: (id: string) => boolean): Associacao[] {
  return mesa.associacoes.filter((a) => {
    if (a.a !== centro && a.b !== centro) return false
    if (a.a === a.b || !associacaoNaColecao(a, mesa.colecao)) return false
    if (ocultas.includes(chaveRelacao(a.rel))) return false
    return naMesa(a.a === centro ? a.b : a.a)
  })
}

/**
 * Monta o recorte em volta de `centro`: esconde o resto, põe os vizinhos num círculo
 * (na ordem em que já estavam em volta dele) e devolve os itens na ordem de caminhar
 * pelas teclas: caixa da associação, texto ligado, próxima caixa, próximo texto…
 */
export function montarRecorte(rf: Mesa, centro: string, ocultas: string[], naMesa: (id: string) => boolean): string[] {
  const assocs = associacoesDoCentro(centro, ocultas, naMesa)
  const outro = (a: Associacao) => (a.a === centro ? a.b : a.a)
  const vizinhos = [...new Set(assocs.map(outro))]
  const no = (id: string) => rf.getNode(id)
  const tam = (id: string) => tamanhoDaFicha(rf, id)
  const meio = (id: string) => {
    const n = no(id)!
    const t = tam(id)
    return { x: n.position.x + t.w / 2, y: n.position.y + t.h / 2 }
  }

  // Ordem dos vizinhos: pelo ângulo em que já estavam em volta do centro (sentido horário a partir do topo).
  const c = meio(centro)
  const angulo = (id: string) => {
    const p = meio(id)
    return (Math.atan2(p.y - c.y, p.x - c.x) + Math.PI * 2.5) % (Math.PI * 2)
  }
  vizinhos.sort((x, y) => angulo(x) - angulo(y))

  // Raio do círculo: cabe a caixa entre o centro e cada vizinho, e os vizinhos não se tocam.
  const raio = (id: string) => Math.max(tam(id).w, tam(id).h) / 2
  const maiorCaixa = Math.max(0, ...assocs.map((a) => Math.max(tamanhoDaCaixa(a.id).w, tamanhoDaCaixa(a.id).h)))
  const maiorVizinho = Math.max(0, ...vizinhos.map(raio))
  const porDistancia = raio(centro) + maiorCaixa + maiorVizinho + 80
  const porVolta = vizinhos.reduce((s, v) => s + 2 * raio(v) + 60, 0) / (2 * Math.PI)
  const R = Math.max(porDistancia, porVolta)

  const lugar = new Map<string, { x: number; y: number }>()
  vizinhos.forEach((v, i) => {
    const ang = -Math.PI / 2 + (i / vizinhos.length) * 2 * Math.PI
    const t = tam(v)
    lugar.set(v, { x: c.x + Math.cos(ang) * R - t.w / 2, y: c.y + Math.sin(ang) * R - t.h / 2 })
  })
  const membros = new Set([centro, ...vizinhos])
  rf.setNodes((ns) =>
    ns.map((n) => ({
      ...n,
      hidden: !membros.has(n.id),
      ...(lugar.has(n.id) && { position: lugar.get(n.id)! }),
    })),
  )

  return vizinhos.flatMap((v) => [...assocs.filter((a) => outro(a) === v).map((a) => CAIXA + a.id), v])
}
