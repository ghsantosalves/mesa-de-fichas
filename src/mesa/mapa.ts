// "Mapa": recolhe as fichas visíveis e as arruma como um fluxograma, em colunas da
// esquerda para a direita, seguindo a direção das setas (quem se apoia em quem vem
// antes). A ordem dentro de cada coluna é escolhida para cruzar menos setas, e as
// caixas das associações ficam no espaço entre as colunas, sem se sobrepor.
// Fichas sem nenhuma associação ficam numa grade abaixo do fluxograma.
// A arrumação de antes fica guardada (por coleção) para poder voltar a ela.

import type { ReactFlowInstance } from '@xyflow/react'
import { alterarMesa, associacaoNaColecao, mesa, posicionarFicha, type Posicao } from '../estado/mesa.ts'
import { LARGURA_RECOLHIDA } from './NoFicha.tsx'
import { mudarFichas, type NoMesa } from './operacoes.ts'
import { mudarAssociacao, type ArestaAssoc } from './assoc.ts'
import { curva, meioDaCurva, type Retangulo } from './geometria.ts'

type Mesa = ReactFlowInstance<NoMesa>

/** Altura de uma ficha recolhida, se ainda não foi medida. */
const ALTURA_RECOLHIDA = 80
/** Largura e altura aproximadas das caixas das associações (com e sem anotação). */
const CAIXA_COM_NOTA = { w: 240, h: 100 }
const CAIXA_SEM_NOTA = { w: 140, h: 34 }

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

/** Arruma as fichas visíveis como fluxograma. Devolve false se não há o que arrumar. */
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
  const W = LARGURA_RECOLHIDA

  const assocs = mesa.associacoes.filter(
    (a) => naMesa.has(a.a) && naMesa.has(a.b) && a.a !== a.b && associacaoNaColecao(a, mesa.colecao),
  )
  const caixa = mesa.notas ? CAIXA_COM_NOTA : CAIXA_SEM_NOTA
  const vao = caixa.w + 100 // espaço entre colunas, onde ficam as caixas
  const folgaVertical = mesa.notas ? 46 : 30

  // --- 1. Grafo dirigido (sem repetir pares) e fichas soltas ---
  const sai = new Map<string, Set<string>>(ids.map((k) => [k, new Set()]))
  for (const a of assocs) sai.get(a.a)!.add(a.b)
  const ligadas = new Set(assocs.flatMap((a) => [a.a, a.b]))
  const noFluxo = ids.filter((k) => ligadas.has(k))
  const soltas = ids.filter((k) => !ligadas.has(k))

  // --- 2. Desfaz ciclos: setas que voltam (A→B→…→A) contam ao contrário só para as colunas ---
  const estado = new Map<string, 1 | 2>()
  const dag = new Map<string, Set<string>>(noFluxo.map((k) => [k, new Set()]))
  const visitar = (u: string) => {
    estado.set(u, 1)
    for (const v of sai.get(u)!) {
      if (estado.get(v) === 1) dag.get(v)!.add(u)
      else {
        dag.get(u)!.add(v)
        if (!estado.has(v)) visitar(v)
      }
    }
    estado.set(u, 2)
  }
  for (const k of noFluxo) if (!estado.has(k)) visitar(k)
  const entra = new Map<string, Set<string>>(noFluxo.map((k) => [k, new Set()]))
  dag.forEach((vs, u) => vs.forEach((v) => entra.get(v)!.add(u)))

  // --- 3. Colunas: cada ficha fica depois de todas as que apontam para ela ---
  const ordemTopo: string[] = []
  const faltam = new Map(noFluxo.map((k) => [k, entra.get(k)!.size]))
  const fila = noFluxo.filter((k) => faltam.get(k) === 0)
  while (fila.length) {
    const u = fila.shift()!
    ordemTopo.push(u)
    for (const v of dag.get(u)!) {
      faltam.set(v, faltam.get(v)! - 1)
      if (faltam.get(v) === 0) fila.push(v)
    }
  }
  const coluna = new Map<string, number>()
  for (const u of ordemTopo) coluna.set(u, Math.max(0, ...[...entra.get(u)!].map((p) => coluna.get(p)! + 1)))
  // Quem só aponta para outras fica logo antes delas (e não lá no começo).
  for (const u of [...ordemTopo].reverse()) {
    const depois = [...dag.get(u)!].map((v) => coluna.get(v)!)
    if (depois.length) coluna.set(u, Math.max(coluna.get(u)!, Math.min(...depois) - 1))
  }
  const nColunas = Math.max(0, ...[...coluna.values()]) + 1
  const colunas: string[][] = Array.from({ length: nColunas }, () => [])
  for (const u of ordemTopo) colunas[coluna.get(u)!].push(u)

  // --- 4. Ordem dentro das colunas: média da posição dos vizinhos (cruza menos setas) ---
  const indice = new Map<string, number>()
  const numerar = () => colunas.forEach((c) => c.forEach((u, i) => indice.set(u, i / Math.max(1, c.length - 1))))
  numerar()
  const media = (u: string, vizinhos: Set<string>) => {
    const v = [...vizinhos].map((x) => indice.get(x)!)
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : indice.get(u)!
  }
  for (let volta = 0; volta < 8; volta++) {
    const ida = volta % 2 === 0
    const seq = ida ? colunas.slice(1) : colunas.slice(0, -1).reverse()
    for (const c of seq) {
      c.sort((x, y) => media(x, ida ? entra.get(x)! : dag.get(x)!) - media(y, ida ? entra.get(y)! : dag.get(y)!))
      numerar()
    }
  }

  // --- 5. Posições: colunas lado a lado, cada uma centrada na vertical ---
  const x0 = Math.min(...fichas.map((n) => n.position.x))
  const y0 = Math.min(...fichas.map((n) => n.position.y))
  const alturaColuna = (c: string[]) => c.reduce((s, u) => s + altura(u) + folgaVertical, -folgaVertical)
  const maior = Math.max(0, ...colunas.map(alturaColuna))
  const lugar = new Map<string, Posicao>()
  colunas.forEach((c, i) => {
    let y = y0 + (maior - alturaColuna(c)) / 2
    for (const u of c) {
      lugar.set(u, { x: Math.round(x0 + i * (W + vao)), y: Math.round(y) })
      y += altura(u) + folgaVertical
    }
  })
  // Fichas soltas: numa grade abaixo do fluxograma.
  const porLinha = Math.max(3, nColunas * 2)
  const yGrade = y0 + (noFluxo.length ? maior + 160 : 0)
  soltas.forEach((u, i) => {
    lugar.set(u, {
      x: Math.round(x0 + (i % porLinha) * (W + 40)),
      y: Math.round(yGrade + Math.floor(i / porLinha) * (ALTURA_RECOLHIDA + 60)),
    })
  })

  rf.setNodes((ns) => ns.map((n) => (lugar.has(n.id) ? { ...n, position: lugar.get(n.id)! } : n)))
  alterarMesa((e) => lugar.forEach((p, id) => posicionarFicha(e, id, p)))

  // --- 6. Caixas das associações: no vão entre colunas, sem se sobrepor ---
  const ret = (u: string): Retangulo => {
    const h = altura(u)
    return { cx: lugar.get(u)!.x + W / 2, cy: lugar.get(u)!.y + h / 2, w: W, h }
  }
  const porVao = new Map<number, { id: string; meio: { x: number; y: number }; x: number; y: number }[]>()
  for (const a of assocs) {
    const c = curva(ret(a.a), ret(a.b))
    const meio = meioDaCurva(c)
    const ca = coluna.get(a.a)!
    const cb = coluna.get(a.b)!
    // O vão logo depois da coluna mais à esquerda das duas fichas.
    const v = Math.min(ca, cb)
    const x = x0 + v * (W + vao) + W + vao / 2
    // Altura da curva nesse ponto (aproximada pela reta entre as pontas).
    const t = c.e.x === c.s.x ? 0.5 : Math.min(1, Math.max(0, (x - c.s.x) / (c.e.x - c.s.x)))
    const y = ca === cb ? meio.y : c.s.y + (c.e.y - c.s.y) * t
    if (!porVao.has(v)) porVao.set(v, [])
    porVao.get(v)!.push({ id: a.id, meio, x, y })
  }
  for (const lista of porVao.values()) {
    lista.sort((p, q) => p.y - q.y)
    // Empurra para baixo as que encostam na de cima e depois recentraliza o grupo.
    const desejado = lista.map((p) => p.y)
    for (let i = 1; i < lista.length; i++) lista[i].y = Math.max(lista[i].y, lista[i - 1].y + caixa.h + 14)
    const desvio = lista.reduce((s, p, i) => s + (p.y - desejado[i]), 0) / lista.length
    for (const p of lista) p.y -= desvio
  }
  const rfAssoc = rf as unknown as ReactFlowInstance<NoMesa, ArestaAssoc>
  for (const lista of porVao.values()) {
    for (const p of lista) mudarAssociacao(rfAssoc, p.id, { dx: p.x - p.meio.x, dy: p.y - p.meio.y }, ['w', 'h'])
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
