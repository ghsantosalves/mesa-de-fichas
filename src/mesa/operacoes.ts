// Operações da mesa que mudam ao mesmo tempo o que está na tela (nós do React Flow)
// e o estado salvo. Usadas pelos cartões, pelas áreas e pela barra.

import type { ReactFlowInstance } from '@xyflow/react'
import { alterarMesa, arredondar, type Area, type Campo, type Cor } from '../estado/mesa.ts'
import type { NoFicha } from './NoFicha.tsx'
import type { NoArea } from './NoArea.tsx'

export type NoMesa = NoFicha | NoArea
type Mesa = ReactFlowInstance<NoMesa>

export const idNoArea = (id: string) => `area:${id}`

/** Muda cor, recolhimento e/ou campos ocultos de fichas. `cor: null` tira a cor. */
export function mudarFichas(
  rf: Mesa,
  chaves: string[],
  m: { cor?: Cor | null; recolhida?: boolean; ocultos?: Campo[] },
) {
  const alvo = new Set(chaves)
  rf.setNodes((ns) =>
    ns.map((n) => {
      if (n.type !== 'ficha' || !alvo.has(n.id)) return n
      const data = { ...n.data }
      if ('cor' in m) data.cor = m.cor ?? undefined
      if ('recolhida' in m) data.recolhida = !!m.recolhida
      if (m.ocultos) data.ocultos = m.ocultos
      return { ...n, data }
    }),
  )
  alterarMesa((e) => {
    for (const chave of chaves) {
      const f = { ...(e.fichas[chave] ?? arredondar(rf.getNode(chave)?.position ?? { x: 0, y: 0 })) }
      if ('cor' in m) {
        if (m.cor) f.cor = m.cor
        else delete f.cor
      }
      if ('recolhida' in m) {
        if (m.recolhida) f.recolhida = true
        else delete f.recolhida
      }
      if (m.ocultos) {
        if (m.ocultos.length) f.ocultos = [...m.ocultos]
        else delete f.ocultos
      }
      e.fichas[chave] = f
    }
  })
}

/** Muda título, posição ou tamanho de uma área. */
export function mudarArea(rf: Mesa, id: string, m: Partial<Omit<Area, 'id'>>) {
  const r = { ...m }
  if (r.x !== undefined) r.x = Math.round(r.x)
  if (r.y !== undefined) r.y = Math.round(r.y)
  if (r.w !== undefined) r.w = Math.round(r.w)
  if (r.h !== undefined) r.h = Math.round(r.h)
  rf.setNodes((ns) =>
    ns.map((n) => {
      if (n.type !== 'area' || n.id !== idNoArea(id)) return n
      const area = { ...n.data.area, ...r }
      return {
        ...n,
        data: { ...n.data, area },
        position: { x: area.x, y: area.y },
        width: area.w,
        height: area.h,
      }
    }),
  )
  alterarMesa((e) => {
    const a = e.areas.find((x) => x.id === id)
    if (a) Object.assign(a, r)
  })
}

export function removerArea(rf: Mesa, id: string) {
  rf.setNodes((ns) => ns.filter((n) => n.id !== idNoArea(id)))
  alterarMesa((e) => {
    e.areas = e.areas.filter((a) => a.id !== id)
  })
}

export function noDeArea(area: Area, oculta: boolean, nova = false): NoArea {
  return {
    id: idNoArea(area.id),
    type: 'area',
    position: { x: area.x, y: area.y },
    width: area.w,
    height: area.h,
    data: { area, nova },
    hidden: oculta,
    dragHandle: '.area-cab',
    selectable: false,
    // Atrás das fichas, mesmo quando uma ficha está selecionada.
    zIndex: -1000,
  }
}

/** Cria uma área de 600 × 400 no centro da parte visível da mesa. */
export function novaArea(rf: Mesa, colecao: string) {
  const tela = document.querySelector('.mesa .react-flow')?.getBoundingClientRect()
  const centro = tela
    ? rf.screenToFlowPosition({ x: tela.left + tela.width / 2, y: tela.top + tela.height / 2 })
    : { x: 0, y: 0 }
  const area: Area = {
    id: crypto.randomUUID().slice(0, 8),
    x: Math.round(centro.x - 300),
    y: Math.round(centro.y - 200),
    w: 600,
    h: 400,
    titulo: 'Nova área',
    colecao,
  }
  // Áreas ficam no começo da lista, para serem desenhadas antes (atrás) das fichas.
  rf.setNodes((ns) => [noDeArea(area, false, true), ...ns])
  alterarMesa((e) => {
    e.areas.push(area)
  })
}
