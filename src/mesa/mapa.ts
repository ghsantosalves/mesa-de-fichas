// "Mapa": recolhe as fichas visíveis e as arruma pelas relações, aproximando as
// que estão ligadas e afastando as que não estão (simulação de forças, d3-force).
// A arrumação de antes fica guardada para poder voltar a ela.

import type { ReactFlowInstance } from '@xyflow/react'
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import { alterarMesa, mesa, posicionarFicha, type Posicao } from '../estado/mesa.ts'
import { LARGURA_RECOLHIDA } from './NoFicha.tsx'
import { mudarFichas, type NoMesa } from './operacoes.ts'

type Mesa = ReactFlowInstance<NoMesa>
type Ponto = SimulationNodeDatum & { id: string }

/** Altura aproximada de uma ficha recolhida. */
const ALTURA_RECOLHIDA = 80

/** Arruma as fichas visíveis como mapa. Devolve false se não há o que arrumar. */
export function arrumarComoMapa(rf: Mesa): boolean {
  const fichas = rf.getNodes().filter((n) => n.type === 'ficha' && !n.hidden)
  if (fichas.length < 2) return false
  const ids = new Set(fichas.map((n) => n.id))

  // Guarda a arrumação de antes (só das fichas que ainda não estavam guardadas, para
  // que apertar "Mapa" de novo não apague o ponto de volta).
  alterarMesa((e) => {
    const antes = e.antesDoMapa ?? {}
    for (const n of fichas) {
      if (antes[n.id] || n.type !== 'ficha') continue
      antes[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y), recolhida: n.data.recolhida }
    }
    e.antesDoMapa = antes
  })
  mudarFichas(rf, [...ids], { recolhida: true })

  // Centro atual do grupo, para o mapa aparecer mais ou menos no mesmo lugar.
  const cx = fichas.reduce((s, n) => s + n.position.x, 0) / fichas.length + LARGURA_RECOLHIDA / 2
  const cy = fichas.reduce((s, n) => s + n.position.y, 0) / fichas.length + ALTURA_RECOLHIDA / 2
  const pontos: Ponto[] = fichas.map((n, i) => ({
    id: n.id,
    // Começa num círculo (com a ordem atual), o que dá resultados estáveis.
    x: cx + Math.cos((i / fichas.length) * 2 * Math.PI) * 400,
    y: cy + Math.sin((i / fichas.length) * 2 * Math.PI) * 400,
  }))
  const ligacoes = mesa.associacoes
    .filter((a) => ids.has(a.a) && ids.has(a.b) && a.a !== a.b)
    .map((a) => ({ source: a.a, target: a.b }))

  const simulacao = forceSimulation(pontos)
    .force('ligacoes', forceLink<Ponto, { source: string; target: string }>(ligacoes).id((p) => p.id).distance(320).strength(0.5))
    .force('repulsao', forceManyBody().strength(-1500))
    .force('colisao', forceCollide(150))
    .force('x', forceX(cx).strength(0.05))
    .force('y', forceY(cy).strength(0.08))
    .stop()
  for (let i = 0; i < 500; i++) simulacao.tick()

  const lugar = new Map<string, Posicao>(
    pontos.map((p) => [p.id, { x: Math.round(p.x! - LARGURA_RECOLHIDA / 2), y: Math.round(p.y! - ALTURA_RECOLHIDA / 2) }]),
  )
  rf.setNodes((ns) => ns.map((n) => (lugar.has(n.id) ? { ...n, position: lugar.get(n.id)! } : n)))
  alterarMesa((e) => lugar.forEach((p, id) => posicionarFicha(e, id, p)))
  return true
}

/** Volta as fichas para onde estavam antes do mapa (e abertas ou recolhidas como estavam). */
export function desfazerMapa(rf: Mesa) {
  const antes = mesa.antesDoMapa
  if (!antes) return
  const existe = new Set(rf.getNodes().map((n) => n.id))
  const chaves = Object.keys(antes).filter((k) => existe.has(k))
  rf.setNodes((ns) => ns.map((n) => (antes[n.id] ? { ...n, position: { x: antes[n.id].x, y: antes[n.id].y } } : n)))
  mudarFichas(rf, chaves.filter((k) => antes[k].recolhida), { recolhida: true })
  mudarFichas(rf, chaves.filter((k) => !antes[k].recolhida), { recolhida: false })
  alterarMesa((e) => {
    for (const k of chaves) posicionarFicha(e, k, antes[k])
    e.antesDoMapa = null
  })
}
