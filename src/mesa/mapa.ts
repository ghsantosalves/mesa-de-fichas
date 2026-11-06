// Arrumação automática da mesa.
//
// "Mapa": espalha as fichas visíveis pela mesa (abertas ou recolhidas, como estiverem)
// de modo que nada fique
// por cima de nada. Fichas e caixas das associações são tratadas como peças: as
// fichas ligadas se atraem, todas as peças se empurram, e cada caixa fica presa entre
// as suas duas fichas. A seta de cada associação passa pela sua caixa, então cada
// linha segue o seu próprio caminho. No fim, um afastamento garante que nenhuma peça
// encoste em outra. Fichas sem associação ficam numa grade abaixo.
// A arrumação de antes fica guardada (por coleção) para poder voltar a ela.
//
// "Acomodar": quando fichas são expandidas (e crescem), as peças vizinhas se afastam
// só o necessário para nada ficar sobreposto; o resto da arrumação continua igual.

import type { Edge, InternalNode, ReactFlowInstance } from '@xyflow/react'
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import { alterarMesa, associacaoNaColecao, mesa, posicionarFicha, type Associacao, type Posicao } from '../estado/mesa.ts'
import { LARGURA_FICHA, LARGURA_RECOLHIDA } from './opcoes.ts'
import { mudarArea, mudarFichas, type NoMesa } from './operacoes.ts'
import { ALTURA_MIN_AREA, LARGURA_MIN_AREA } from '../estado/mesa.ts'
import { mudarAssociacao, type ArestaAssoc, type DadosAresta } from './assoc.ts'
import { curva, meioDaCurva, type Retangulo } from './geometria.ts'

type Mesa = ReactFlowInstance<NoMesa>
/** Peça da mesa: ficha, caixa de associação ou área, com centro (x, y) e tamanho. */
type Peca = SimulationNodeDatum & {
  id: string
  w: number
  h: number
  caixa: boolean
  fixa?: boolean
  /** Ponto invisível que mantém juntas as fichas de uma área (não ocupa espaço). */
  virtual?: boolean
  /** Para áreas: as fichas que ficam dentro dela (elas não são empurradas para fora). */
  membros?: Set<string>
}

/** Altura de uma ficha recolhida, se ainda não foi medida. */
const ALTURA_RECOLHIDA = 80
/** Tamanho aproximado das caixas das associações, se ainda não foram medidas. */
const CAIXA_COM_NOTA = { w: 260, h: 110 }
const CAIXA_SEM_NOTA = { w: 150, h: 36 }
/** Espaço livre mínimo entre duas peças. */
const FOLGA = 28

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
/** Raio do círculo usado na simulação (o afastamento final usa o retângulo exato). */
const raio = (p: Peca) => (p.w + p.h) / 4 + FOLGA / 2
const comoAssoc = (rf: Mesa) => rf as unknown as ReactFlowInstance<NoMesa, ArestaAssoc>

/**
 * Tamanho de uma ficha: o medido pela mesa ou, se ela ainda não mediu, o da tela
 * (sem o zoom); por último, o tamanho padrão.
 */
export function tamanhoDaFicha(rf: Mesa, id: string): { w: number; h: number } {
  const n = rf.getNode(id)
  const el = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`)
  const recolhida = n?.type === 'ficha' && n.data.recolhida
  return {
    w: n?.measured?.width || el?.offsetWidth || (recolhida ? LARGURA_RECOLHIDA : LARGURA_FICHA),
    h: n?.measured?.height || el?.offsetHeight || ALTURA_RECOLHIDA,
  }
}

/** Tamanho da caixa de uma associação, medido na tela (sem o zoom). */
export function tamanhoDaCaixa(id: string): { w: number; h: number } {
  const el = document.querySelector<HTMLElement>(`.assoc[data-assoc="${id}"]`)
  if (el && el.offsetWidth) return { w: el.offsetWidth, h: el.offsetHeight }
  return mesa.notas ? CAIXA_COM_NOTA : CAIXA_SEM_NOTA
}

/**
 * Afasta as peças que ainda se encostam, empurrando pelo lado em que entram menos uma
 * na outra. Peças fixas não se mexem: a outra sai do caminho sozinha. `ignorar` diz
 * quais pares podem ficar um sobre o outro (ex.: uma área e as fichas de dentro dela).
 */
function afastar(pecas: Peca[], ignorar: (a: Peca, b: Peca) => boolean = () => false) {
  for (let volta = 0; volta < 300; volta++) {
    let mexeu = false
    for (let i = 0; i < pecas.length; i++) {
      for (let j = i + 1; j < pecas.length; j++) {
        const a = pecas[i]
        const b = pecas[j]
        if ((a.fixa && b.fixa) || ignorar(a, b)) continue
        const dx = b.x! - a.x!
        const dy = b.y! - a.y!
        const ox = (a.w + b.w) / 2 + FOLGA - Math.abs(dx)
        const oy = (a.h + b.h) / 2 + FOLGA - Math.abs(dy)
        if (ox <= 0 || oy <= 0) continue
        mexeu = true
        // Quanto cada uma anda: tudo para a que não é fixa, ou metade para cada.
        const pa = a.fixa ? 0 : b.fixa ? 1 : 0.5
        const pb = 1 - pa
        if (ox < oy) {
          const m = (ox + 1) * (dx >= 0 ? 1 : -1)
          a.x! -= m * pa
          b.x! += m * pb
        } else {
          const m = (oy + 1) * (dy >= 0 ? 1 : -1)
          a.y! -= m * pa
          b.y! += m * pb
        }
      }
    }
    if (!mexeu) return
  }
}

/** Retângulo (centro e tamanho) de uma ficha na posição dada. */
const retangulo = (p: Posicao, w: number, h: number): Retangulo => ({ cx: p.x + w / 2, cy: p.y + h / 2, w, h })

/** Áreas visíveis (com o id da área e o retângulo). */
function areasVisiveis(rf: Mesa) {
  return rf
    .getNodes()
    .filter((n) => n.type === 'area' && !n.hidden)
    .map((n) => {
      const a = (n as NoMesa & { type: 'area' }).data.area
      return { id: a.id, x: n.position.x, y: n.position.y, w: n.measured?.width ?? a.w, h: n.measured?.height ?? a.h }
    })
}

/** Margens da área em volta das fichas de dentro (em cima fica o título). */
const MARGEM_AREA = { lado: 30, topo: 58, baixo: 30 }

/** Arruma as fichas visíveis como mapa. Devolve false se não há o que arrumar. */
export async function arrumarComoMapa(rf: Mesa): Promise<boolean> {
  const fichas = rf.getNodes().filter((n) => n.type === 'ficha' && !n.hidden)
  if (fichas.length < 2) return false
  const ids = fichas.map((n) => n.id)
  const naMesa = new Set(ids)
  const assocs = mesa.associacoes.filter(
    (a) => naMesa.has(a.a) && naMesa.has(a.b) && a.a !== a.b && associacaoNaColecao(a, mesa.colecao),
  )
  const areas = areasVisiveis(rf)

  // Guarda a arrumação de antes, nesta coleção (fichas e áreas; só o que ainda não
  // estava guardado, para que apertar "Mapa" de novo não apague o ponto de volta).
  alterarMesa((e) => {
    const antes = (e.mapas[e.colecao] ??= {})
    for (const n of fichas) {
      if (antes[n.id] || n.type !== 'ficha') continue
      antes[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) }
      if (n.data.recolhida) antes[n.id].recolhida = true
    }
    for (const a of areas) {
      const k = `area:${a.id}`
      if (!antes[k]) antes[k] = { x: Math.round(a.x), y: Math.round(a.y), w: Math.round(a.w), h: Math.round(a.h) }
    }
  })
  // As fichas ficam como estão (abertas ou recolhidas). As caixas voltam ao tamanho
  // natural (para caber o texto todo); depois espera a mesa medir tudo de novo.
  const fixadas = assocs.filter((a) => a.w || a.h)
  for (const a of fixadas) mudarAssociacao(comoAssoc(rf), a.id, {}, ['w', 'h'])
  if (fixadas.length) await esperar(150)
  /** Tamanho medido de cada ficha (aberta ou recolhida). */
  const tamanho = (id: string) => tamanhoDaFicha(rf, id)

  // Em que área está cada ficha (pelo topo-centro, como ao arrastar a área; na menor, se houver mais de uma).
  const areaDe = new Map<string, string>()
  for (const n of fichas) {
    const cx = n.position.x + tamanho(n.id).w / 2
    const cy = n.position.y + 40
    const dentro = areas.filter((a) => cx > a.x && cx < a.x + a.w && cy > a.y && cy < a.y + a.h)
    dentro.sort((a, b) => a.w * a.h - b.w * b.h)
    if (dentro[0]) areaDe.set(n.id, dentro[0].id)
  }
  const membros = new Map<string, Set<string>>()
  areaDe.forEach((area, ficha) => {
    if (!membros.has(area)) membros.set(area, new Set())
    membros.get(area)!.add(ficha)
  })

  const ligadas = new Set(assocs.flatMap((a) => [a.a, a.b]))
  // No mapa: as fichas ligadas e as que estão em áreas (estas ficam juntas, com a área).
  const noMapa = ids.filter((k) => ligadas.has(k) || areaDe.has(k))
  const soltas = ids.filter((k) => !ligadas.has(k) && !areaDe.has(k))

  // Peças: começam num círculo (na ordem atual), o que dá resultados estáveis.
  const x0 = Math.min(...fichas.map((n) => n.position.x))
  const y0 = Math.min(...fichas.map((n) => n.position.y))
  const r0 = Math.max(400, noMapa.reduce((s, k) => s + tamanho(k).w + tamanho(k).h, 0) / 6)
  const pecas = new Map<string, Peca>()
  noMapa.forEach((k, i) => {
    const ang = (i / noMapa.length) * 2 * Math.PI
    pecas.set(k, { id: k, ...tamanho(k), caixa: false, x: Math.cos(ang) * r0, y: Math.sin(ang) * r0 })
  })
  for (const a of assocs) {
    const pa = pecas.get(a.a)!
    const pb = pecas.get(a.b)!
    const t = tamanhoDaCaixa(a.id)
    pecas.set(`caixa:${a.id}`, { id: `caixa:${a.id}`, ...t, caixa: true, x: (pa.x! + pb.x!) / 2, y: (pa.y! + pb.y!) / 2 })
  }
  // Um ponto invisível por área, preso às fichas dela: assim elas ficam juntas.
  for (const area of membros.keys()) pecas.set(`grupo:${area}`, { id: `grupo:${area}`, w: 0, h: 0, caixa: false, virtual: true, x: 0, y: 0 })
  const lista = [...pecas.values()]
  type Ligacao = { source: string; target: string; d: number; forca: number }
  const ligacoes: Ligacao[] = assocs.flatMap((a) => {
    const c = pecas.get(`caixa:${a.id}`)!
    const d = (k: string) => raio(pecas.get(k)!) + raio(c) + 30
    return [
      { source: a.a, target: c.id, d: d(a.a), forca: 0.8 },
      { source: c.id, target: a.b, d: d(a.b), forca: 0.8 },
    ]
  })
  membros.forEach((fs, area) => {
    for (const k of fs) ligacoes.push({ source: k, target: `grupo:${area}`, d: raio(pecas.get(k)!) + 20, forca: 0.6 })
  })

  if (lista.length) {
    const simulacao = forceSimulation<Peca>(lista)
      .force(
        'ligacoes',
        forceLink<Peca, Ligacao>(ligacoes)
          .id((p) => p.id)
          .distance((l) => l.d)
          .strength((l) => l.forca),
      )
      .force('repulsao', forceManyBody<Peca>().strength((p) => (p.virtual ? 0 : p.caixa ? -500 : -2000)))
      .force('colisao', forceCollide<Peca>((p) => (p.virtual ? 0 : raio(p) + FOLGA / 2)).strength(0.9).iterations(3))
      .force('x', forceX(0).strength(0.03))
      .force('y', forceY(0).strength(0.05))
      .stop()
    for (let i = 0; i < 700; i++) simulacao.tick()
  }
  const reais = lista.filter((p) => !p.virtual)
  afastar(reais)

  // Fichas soltas: numa grade abaixo do mapa (cada linha tão alta quanto a maior ficha dela).
  const fundo = (ps: Peca[]) => (ps.length ? Math.max(...ps.map((p) => p.y! + p.h / 2)) : 0)
  const esquerda = reais.length ? Math.min(...reais.map((p) => p.x! - p.w / 2)) : 0
  let y = reais.length ? fundo(reais) + 160 : 0
  const porLinha = Math.max(3, Math.ceil(Math.sqrt(soltas.length * 2)))
  const largCol = Math.max(LARGURA_RECOLHIDA, ...soltas.map((k) => tamanho(k).w)) + 40
  for (let i = 0; i < soltas.length; i += porLinha) {
    const linha = soltas.slice(i, i + porLinha)
    linha.forEach((k, j) => {
      const t = tamanho(k)
      const peca: Peca = { id: k, ...t, caixa: false, x: esquerda + j * largCol + t.w / 2, y: y + t.h / 2 }
      pecas.set(k, peca)
      reais.push(peca)
    })
    y += Math.max(...linha.map((k) => tamanho(k).h)) + 50
  }

  // Áreas: cada uma em volta das suas fichas; o que não é dela sai de dentro.
  const pecasDeArea: Peca[] = []
  membros.forEach((fs, area) => {
    const ps = [...fs].map((k) => pecas.get(k)!)
    const esq = Math.min(...ps.map((p) => p.x! - p.w / 2)) - MARGEM_AREA.lado
    const dir = Math.max(...ps.map((p) => p.x! + p.w / 2)) + MARGEM_AREA.lado
    const cima = Math.min(...ps.map((p) => p.y! - p.h / 2)) - MARGEM_AREA.topo
    const baixo = Math.max(...ps.map((p) => p.y! + p.h / 2)) + MARGEM_AREA.baixo
    const w = Math.max(LARGURA_MIN_AREA, dir - esq)
    const h = Math.max(ALTURA_MIN_AREA, baixo - cima)
    pecasDeArea.push({ id: `area:${area}`, w, h, x: esq + w / 2, y: cima + h / 2, caixa: false, fixa: true, membros: fs })
  })
  // Pares que podem ficar um sobre o outro: a área e as fichas dela; a área e as caixas
  // das associações entre duas fichas dela.
  const pontas = new Map(assocs.map((a) => [`caixa:${a.id}`, [a.a, a.b]]))
  const daArea = (area: Peca, outra: Peca) => {
    if (outra.membros || !area.membros) return false
    if (area.membros.has(outra.id)) return true
    const pp = pontas.get(outra.id)
    return !!pp && area.membros.has(pp[0]) && area.membros.has(pp[1])
  }
  afastar([...reais, ...pecasDeArea], (a, b) => daArea(a, b) || daArea(b, a))
  // Áreas vazias (sem fichas): abaixo de tudo, para não cobrir nada.
  const vazias = areas.filter((a) => !membros.has(a.id))
  let xVazia = esquerda
  const yVazia = fundo([...reais, ...pecasDeArea]) + 120
  for (const a of vazias) {
    pecasDeArea.push({ id: `area:${a.id}`, w: a.w, h: a.h, x: xVazia + a.w / 2, y: yVazia + a.h / 2, caixa: false, fixa: true })
    xVazia += a.w + 40
  }

  // Posições finais (o mapa começa onde começava a arrumação de antes).
  const todas = [...reais, ...pecasDeArea]
  const minX = Math.min(0, ...todas.map((p) => p.x! - p.w / 2))
  const minY = Math.min(0, ...todas.map((p) => p.y! - p.h / 2))
  const final = (p: Peca) => ({ x: Math.round(x0 + p.x! - p.w / 2 - minX), y: Math.round(y0 + p.y! - p.h / 2 - minY) })
  const lugar = new Map<string, Posicao>()
  for (const k of ids) lugar.set(k, final(pecas.get(k)!))
  rf.setNodes((ns) => ns.map((n) => (lugar.has(n.id) ? { ...n, position: lugar.get(n.id)! } : n)))
  alterarMesa((e) => lugar.forEach((p, id) => posicionarFicha(e, id, p)))
  for (const p of pecasDeArea) mudarArea(rf, p.id.slice('area:'.length), { ...final(p), w: Math.round(p.w), h: Math.round(p.h) })

  // Caixas: onde o mapa as deixou. A posição é guardada como deslocamento a partir do
  // meio da curva entre as duas fichas (o mesmo ponto que a mesa usa para desenhar).
  const ret = (k: string) => retangulo(lugar.get(k)!, tamanho(k).w, tamanho(k).h)
  for (const a of assocs) {
    const p = pecas.get(`caixa:${a.id}`)!
    const meio = meioDaCurva(curva(ret(a.a), ret(a.b)))
    mudarAssociacao(comoAssoc(rf), a.id, { dx: x0 + p.x! - minX - meio.x, dy: y0 + p.y! - minY - meio.y })
  }
  return true
}

/**
 * Afasta o necessário para que nenhuma ficha visível nem caixa de associação fique
 * sobreposta (por exemplo, depois de expandir fichas). As fichas em `fixas` não se
 * mexem. Chamar depois que a mesa mediu os tamanhos novos.
 */
export function acomodarMesa(rf: Mesa, fixas: string[] = []) {
  const fixo = new Set(fixas)
  const internos = new Map<string, InternalNode<NoMesa>>()
  for (const n of rf.getNodes()) {
    if (n.type !== 'ficha' || n.hidden) continue
    const i = rf.getInternalNode(n.id)
    if (i?.measured.width) internos.set(n.id, i)
  }
  const retFicha = (i: InternalNode<NoMesa>, p = i.internals.positionAbsolute) =>
    retangulo(p, i.measured.width!, i.measured.height!)

  const pecas: Peca[] = []
  for (const [id, i] of internos) {
    const r = retFicha(i)
    pecas.push({ id, x: r.cx, y: r.cy, w: r.w, h: r.h, caixa: false, fixa: fixo.has(id) })
  }
  // Caixas desenhadas na tela (as escondidas pela legenda não contam).
  const caixas: { assoc: Associacao; centro0: { x: number; y: number } }[] = []
  for (const e of rf.getEdges() as Edge<DadosAresta>[]) {
    const a = e.data?.assoc
    const ia = internos.get(e.source)
    const ib = internos.get(e.target)
    if (!a || !ia || !ib || !document.querySelector(`.assoc[data-assoc="${a.id}"]`)) continue
    const meio = meioDaCurva(curva(retFicha(ia), retFicha(ib)))
    const centro0 = { x: meio.x + (a.dx ?? 0), y: meio.y + (a.dy ?? 0) }
    caixas.push({ assoc: a, centro0 })
    pecas.push({ id: `caixa:${a.id}`, ...centro0, ...tamanhoDaCaixa(a.id), caixa: true })
  }
  const antes = new Map(pecas.map((p) => [p.id, { x: p.x!, y: p.y! }]))
  afastar(pecas)
  const mexeu = (p: Peca) => Math.abs(p.x! - antes.get(p.id)!.x) > 0.5 || Math.abs(p.y! - antes.get(p.id)!.y) > 0.5

  // Fichas que andaram: nova posição (canto superior esquerdo).
  const lugar = new Map<string, Posicao>()
  for (const p of pecas) {
    if (p.caixa || !mexeu(p)) continue
    lugar.set(p.id, { x: Math.round(p.x! - p.w / 2), y: Math.round(p.y! - p.h / 2) })
  }
  if (lugar.size) {
    rf.setNodes((ns) => ns.map((n) => (lugar.has(n.id) ? { ...n, position: lugar.get(n.id)! } : n)))
    alterarMesa((e) => lugar.forEach((p, id) => posicionarFicha(e, id, p)))
  }
  // Caixas: as que andaram, ou cujas fichas andaram, ficam onde a acomodação as deixou.
  // (Uma caixa que estava no meio da seta e não precisou sair continua no meio.)
  const porId = new Map(pecas.map((p) => [p.id, p]))
  for (const { assoc: a } of caixas) {
    const p = porId.get(`caixa:${a.id}`)!
    const noMeio = !a.dx && !a.dy
    if (!mexeu(p) && (noMeio || (!lugar.has(a.a) && !lugar.has(a.b)))) continue
    const ia = internos.get(a.a)!
    const ib = internos.get(a.b)!
    const ra = retFicha(ia, lugar.get(a.a) ?? ia.internals.positionAbsolute)
    const rb = retFicha(ib, lugar.get(a.b) ?? ib.internals.positionAbsolute)
    const meio = meioDaCurva(curva(ra, rb))
    mudarAssociacao(comoAssoc(rf), a.id, { dx: p.x! - meio.x, dy: p.y! - meio.y })
  }
}

/** Volta as fichas para onde estavam antes do mapa (e abertas ou recolhidas como estavam). */
export function desfazerMapa(rf: Mesa) {
  const antes = mesa.mapas[mesa.colecao]
  if (!antes) return
  const existe = new Set(rf.getNodes().map((n) => n.id))
  const chaves = Object.keys(antes).filter((k) => existe.has(k) && !k.startsWith('area:'))
  // Áreas guardadas como "area:<id>", com posição e tamanho.
  for (const [k, a] of Object.entries(antes)) {
    if (!k.startsWith('area:') || !existe.has(k)) continue
    mudarArea(rf, k.slice('area:'.length), { x: a.x, y: a.y, ...(a.w && a.h ? { w: a.w, h: a.h } : {}) })
  }
  rf.setNodes((ns) => ns.map((n) => (n.type === 'ficha' && antes[n.id] ? { ...n, position: { x: antes[n.id].x, y: antes[n.id].y } } : n)))
  mudarFichas(rf, chaves.filter((k) => antes[k].recolhida), { recolhida: true })
  mudarFichas(rf, chaves.filter((k) => !antes[k].recolhida), { recolhida: false })
  alterarMesa((e) => {
    for (const k of chaves) posicionarFicha(e, k, antes[k])
    delete e.mapas[e.colecao]
  })
}
