// "Mapa": recolhe as fichas visíveis e as espalha pela mesa de modo que nada fique
// por cima de nada. Fichas e caixas das associações são tratadas como peças: as
// fichas ligadas se atraem, todas as peças se empurram, e cada caixa fica presa entre
// as suas duas fichas. A seta de cada associação passa pela sua caixa, então cada
// linha segue o seu próprio caminho. No fim, um afastamento garante que nenhuma peça
// encoste em outra. Fichas sem associação ficam numa grade abaixo.
// A arrumação de antes fica guardada (por coleção) para poder voltar a ela.

import type { ReactFlowInstance } from '@xyflow/react'
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import { alterarMesa, associacaoNaColecao, mesa, posicionarFicha, type Posicao } from '../estado/mesa.ts'
import { LARGURA_RECOLHIDA } from './NoFicha.tsx'
import { mudarFichas, type NoMesa } from './operacoes.ts'
import { mudarAssociacao, type ArestaAssoc } from './assoc.ts'
import { curva, meioDaCurva } from './geometria.ts'

type Mesa = ReactFlowInstance<NoMesa>
/** Peça do mapa: ficha ou caixa de associação, com centro (x, y) e tamanho. */
type Peca = SimulationNodeDatum & { id: string; w: number; h: number; caixa: boolean }

/** Altura de uma ficha recolhida, se ainda não foi medida. */
const ALTURA_RECOLHIDA = 80
/** Tamanho aproximado das caixas das associações (com e sem anotação). */
const CAIXA_COM_NOTA = { w: 240, h: 100 }
const CAIXA_SEM_NOTA = { w: 150, h: 36 }
/** Espaço livre mínimo entre duas peças. */
const FOLGA = 28

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
const raio = (p: Peca) => Math.hypot(p.w, p.h) / 2

/** Afasta as peças que ainda se encostam (empurrando pelo lado em que entram menos uma na outra). */
function afastar(pecas: Peca[]) {
  for (let volta = 0; volta < 200; volta++) {
    let mexeu = false
    for (let i = 0; i < pecas.length; i++) {
      for (let j = i + 1; j < pecas.length; j++) {
        const a = pecas[i]
        const b = pecas[j]
        const dx = b.x! - a.x!
        const dy = b.y! - a.y!
        const ox = (a.w + b.w) / 2 + FOLGA - Math.abs(dx)
        const oy = (a.h + b.h) / 2 + FOLGA - Math.abs(dy)
        if (ox <= 0 || oy <= 0) continue
        mexeu = true
        if (ox < oy) {
          const m = (ox / 2 + 0.5) * (dx >= 0 ? 1 : -1)
          a.x! -= m
          b.x! += m
        } else {
          const m = (oy / 2 + 0.5) * (dy >= 0 ? 1 : -1)
          a.y! -= m
          b.y! += m
        }
      }
    }
    if (!mexeu) return
  }
}

/** Arruma as fichas visíveis como mapa. Devolve false se não há o que arrumar. */
export async function arrumarComoMapa(rf: Mesa): Promise<boolean> {
  const fichas = rf.getNodes().filter((n) => n.type === 'ficha' && !n.hidden)
  if (fichas.length < 2) return false
  const ids = fichas.map((n) => n.id)
  const naMesa = new Set(ids)

  // Guarda a arrumação de antes, nesta coleção (só das fichas que ainda não estavam
  // guardadas, para que apertar "Mapa" de novo não apague o ponto de volta).
  alterarMesa((e) => {
    const antes = (e.mapas[e.colecao] ??= {})
    for (const n of fichas) {
      if (antes[n.id] || n.type !== 'ficha') continue
      antes[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) }
      if (n.data.recolhida) antes[n.id].recolhida = true
    }
  })
  // Recolhe e espera a mesa medir as fichas recolhidas (a altura varia com o título).
  mudarFichas(rf, ids, { recolhida: true })
  await esperar(120)
  const altura = (id: string) => rf.getNode(id)?.measured?.height ?? ALTURA_RECOLHIDA

  const assocs = mesa.associacoes.filter(
    (a) => naMesa.has(a.a) && naMesa.has(a.b) && a.a !== a.b && associacaoNaColecao(a, mesa.colecao),
  )
  const tamCaixa = mesa.notas ? CAIXA_COM_NOTA : CAIXA_SEM_NOTA
  const ligadas = new Set(assocs.flatMap((a) => [a.a, a.b]))
  const noMapa = ids.filter((k) => ligadas.has(k))
  const soltas = ids.filter((k) => !ligadas.has(k))

  // Peças: começam num círculo (na ordem atual), o que dá resultados estáveis.
  const x0 = Math.min(...fichas.map((n) => n.position.x))
  const y0 = Math.min(...fichas.map((n) => n.position.y))
  const r0 = Math.max(400, noMapa.length * 70)
  const pecas = new Map<string, Peca>()
  noMapa.forEach((k, i) => {
    const ang = (i / noMapa.length) * 2 * Math.PI
    pecas.set(k, { id: k, w: LARGURA_RECOLHIDA, h: altura(k), caixa: false, x: Math.cos(ang) * r0, y: Math.sin(ang) * r0 })
  })
  for (const a of assocs) {
    const pa = pecas.get(a.a)!
    const pb = pecas.get(a.b)!
    pecas.set(`caixa:${a.id}`, { id: `caixa:${a.id}`, ...tamCaixa, caixa: true, x: (pa.x! + pb.x!) / 2, y: (pa.y! + pb.y!) / 2 })
  }
  const lista = [...pecas.values()]
  type Ligacao = { source: string; target: string; d: number; forca: number }
  const distancia = (LARGURA_RECOLHIDA + tamCaixa.w) / 2 + 60
  const ligacoes: Ligacao[] = assocs.flatMap((a) => [
    { source: a.a, target: `caixa:${a.id}`, d: distancia, forca: 0.8 },
    { source: `caixa:${a.id}`, target: a.b, d: distancia, forca: 0.8 },
  ])

  if (lista.length) {
    const simulacao = forceSimulation<Peca>(lista)
      .force(
        'ligacoes',
        forceLink<Peca, Ligacao>(ligacoes)
          .id((p) => p.id)
          .distance((l) => l.d)
          .strength((l) => l.forca),
      )
      .force('repulsao', forceManyBody<Peca>().strength((p) => (p.caixa ? -500 : -2000)))
      .force('colisao', forceCollide<Peca>((p) => raio(p) + FOLGA / 2).strength(0.9).iterations(3))
      .force('x', forceX(0).strength(0.03))
      .force('y', forceY(0).strength(0.05))
      .stop()
    for (let i = 0; i < 700; i++) simulacao.tick()
    afastar(lista)
  }

  // Posições finais das fichas (o mapa começa onde começava a arrumação de antes).
  const minX = Math.min(0, ...lista.map((p) => p.x! - p.w / 2))
  const minY = Math.min(0, ...lista.map((p) => p.y! - p.h / 2))
  const lugar = new Map<string, Posicao>()
  for (const k of noMapa) {
    const p = pecas.get(k)!
    lugar.set(k, { x: Math.round(x0 + p.x! - p.w / 2 - minX), y: Math.round(y0 + p.y! - p.h / 2 - minY) })
  }
  // Fichas soltas: numa grade abaixo do mapa.
  const fundo = noMapa.length ? Math.max(...noMapa.map((k) => lugar.get(k)!.y + altura(k))) + 160 : y0
  const porLinha = Math.max(3, Math.ceil(Math.sqrt(soltas.length * 2)))
  soltas.forEach((k, i) => {
    lugar.set(k, {
      x: Math.round(x0 + (i % porLinha) * (LARGURA_RECOLHIDA + 40)),
      y: Math.round(fundo + Math.floor(i / porLinha) * (ALTURA_RECOLHIDA + 50)),
    })
  })
  rf.setNodes((ns) => ns.map((n) => (lugar.has(n.id) ? { ...n, position: lugar.get(n.id)! } : n)))
  alterarMesa((e) => lugar.forEach((p, id) => posicionarFicha(e, id, p)))

  // Caixas: onde o mapa as deixou. A posição é guardada como deslocamento a partir do
  // meio da curva entre as duas fichas (o mesmo ponto que a mesa usa para desenhar).
  const ret = (k: string) => {
    const h = altura(k)
    return { cx: lugar.get(k)!.x + LARGURA_RECOLHIDA / 2, cy: lugar.get(k)!.y + h / 2, w: LARGURA_RECOLHIDA, h }
  }
  const rfAssoc = rf as unknown as ReactFlowInstance<NoMesa, ArestaAssoc>
  for (const a of assocs) {
    const p = pecas.get(`caixa:${a.id}`)!
    const meio = meioDaCurva(curva(ret(a.a), ret(a.b)))
    const cx = x0 + p.x! - minX
    const cy = y0 + p.y! - minY
    mudarAssociacao(rfAssoc, a.id, { dx: cx - meio.x, dy: cy - meio.y }, ['w', 'h'])
  }
  return true
}

/** Volta as fichas para onde estavam antes do mapa (e abertas ou recolhidas como estavam). */
export function desfazerMapa(rf: Mesa) {
  const antes = mesa.mapas[mesa.colecao]
  if (!antes) return
  const existe = new Set(rf.getNodes().map((n) => n.id))
  const chaves = Object.keys(antes).filter((k) => existe.has(k))
  rf.setNodes((ns) => ns.map((n) => (antes[n.id] ? { ...n, position: { x: antes[n.id].x, y: antes[n.id].y } } : n)))
  mudarFichas(rf, chaves.filter((k) => antes[k].recolhida), { recolhida: true })
  mudarFichas(rf, chaves.filter((k) => !antes[k].recolhida), { recolhida: false })
  alterarMesa((e) => {
    for (const k of chaves) posicionarFicha(e, k, antes[k])
    delete e.mapas[e.colecao]
  })
}
