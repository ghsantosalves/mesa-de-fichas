// Desenho de uma associação: seta da borda da ficha A até a borda da ficha B e,
// no meio, a caixa com a relação e a anotação. A caixa pode ser arrastada
// (ligada à seta por um tracejado) e redimensionada pelo canto.

import { memo, useContext, useRef, useState, type PointerEvent } from 'react'
import { EdgeLabelRenderer, useInternalNode, useReactFlow, type EdgeProps, type InternalNode } from '@xyflow/react'
import type { Associacao } from '../estado/mesa.ts'
import { ALTURA_MIN_CAIXA, LARGURA_MIN_CAIXA, mudarAssociacao, type ArestaAssoc } from './assoc.ts'
import { Contexto } from './contexto.ts'
import type { NoMesa } from './operacoes.ts'
import { t } from '../i18n.ts'

type Retangulo = { w: number; h: number; cx: number; cy: number }

function retangulo(n: InternalNode<NoMesa>): Retangulo {
  const w = n.measured.width ?? 300
  const h = n.measured.height ?? 200
  const p = n.internals.positionAbsolute
  return { w, h, cx: p.x + w / 2, cy: p.y + h / 2 }
}

/** Ponto onde a reta do centro de `c` até (tx, ty) sai do retângulo, com uma folga. */
function borda(c: Retangulo, tx: number, ty: number, folga: number) {
  const dx = tx - c.cx
  const dy = ty - c.cy
  if (!dx && !dy) return { x: c.cx, y: c.cy }
  const s = Math.min((c.w / 2 + folga) / Math.abs(dx || 1e-9), (c.h / 2 + folga) / Math.abs(dy || 1e-9))
  return { x: c.cx + dx * s, y: c.cy + dy * s }
}

function Aresta({ id, source, target, data }: EdgeProps<ArestaAssoc>) {
  const A = useInternalNode<NoMesa>(source)
  const B = useInternalNode<NoMesa>(target)
  const { ativa, notas } = useContext(Contexto)
  if (!A || !B || !data) return null

  const ra = retangulo(A)
  const rb = retangulo(B)
  const a = borda(ra, rb.cx, rb.cy, 4)
  const b = borda(rb, ra.cx, ra.cy, 6)
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const assoc = data.assoc
  const ehAtiva = ativa === id
  const seta = `seta-${id}`

  return (
    <>
      <defs>
        <marker id={seta} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className={`seta${ehAtiva ? ' ativa' : ''}`} />
        </marker>
      </defs>
      <path className={`fio${ehAtiva ? ' ativo' : ''}`} d={`M${a.x},${a.y} L${b.x},${b.y}`} markerEnd={`url(#${seta})`} />
      <EdgeLabelRenderer>
        <Caixa assoc={assoc} mx={mx} my={my} ativa={ehAtiva} notas={notas} />
      </EdgeLabelRenderer>
    </>
  )
}

function Caixa({
  assoc,
  mx,
  my,
  ativa,
  notas,
}: {
  assoc: Associacao
  mx: number
  my: number
  ativa: boolean
  notas: boolean
}) {
  const rf = useReactFlow<NoMesa, ArestaAssoc>()
  const { abrirAssoc } = useContext(Contexto)
  const el = useRef<HTMLDivElement>(null)
  /** Valores provisórios enquanto a caixa é arrastada ou redimensionada. */
  const [prov, setProv] = useState<Partial<Associacao> | null>(null)
  const arraste = useRef<{
    modo: 'mover' | 'tamanho'
    sx: number
    sy: number
    dx: number
    dy: number
    w: number
    h: number
    moveu: boolean
  } | null>(null)

  const v = { ...assoc, ...prov }
  const dx = v.dx ?? 0
  const dy = v.dy ?? 0

  const aoApertar = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const modo = (e.target as HTMLElement).closest('.assoc-alca') ? 'tamanho' : 'mover'
    arraste.current = {
      modo,
      sx: e.clientX,
      sy: e.clientY,
      dx,
      dy,
      w: el.current?.offsetWidth ?? 200,
      h: el.current?.offsetHeight ?? 60,
      moveu: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const aoMover = (e: PointerEvent<HTMLDivElement>) => {
    const a = arraste.current
    if (!a) return
    if (!a.moveu && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) < 5) return
    a.moveu = true
    const z = rf.getZoom()
    const ox = (e.clientX - a.sx) / z
    const oy = (e.clientY - a.sy) / z
    if (a.modo === 'mover') setProv({ dx: a.dx + ox, dy: a.dy + oy })
    else {
      const w = Math.max(LARGURA_MIN_CAIXA, a.w + ox)
      const h = Math.max(ALTURA_MIN_CAIXA, a.h + oy)
      // Mantém o canto superior esquerdo no lugar.
      setProv({ w, h, dx: a.dx + (w - a.w) / 2, dy: a.dy + (h - a.h) / 2 })
    }
  }
  const aoSoltar = () => {
    const a = arraste.current
    arraste.current = null
    if (!a) return
    if (!a.moveu) {
      if (a.modo === 'mover') abrirAssoc(assoc.id)
      return
    }
    if (prov) mudarAssociacao(rf, assoc.id, prov)
    setProv(null)
  }

  return (
    <>
      {(dx !== 0 || dy !== 0) && (
        <svg className="guia-assoc" style={{ left: 0, top: 0 }}>
          <line x1={mx} y1={my} x2={mx + dx} y2={my + dy} className="fio-guia" />
        </svg>
      )}
      <div
        ref={el}
        className={`assoc nodrag nopan${ativa ? ' ativo' : ''}${v.h ? ' fixa' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={t('assoc.rotulo', { rel: v.rel.trim() || t('assoc.aDefinir') })}
        style={{
          transform: `translate(-50%, -50%) translate(${mx + dx}px, ${my + dy}px)`,
          width: v.w,
          maxWidth: v.w ? 'none' : undefined,
          height: v.h,
        }}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            abrirAssoc(assoc.id)
          }
        }}
      >
        <span className="rel">{v.rel.trim() || t('assoc.aDefinir')}</span>
        {notas && <span className={`nota${v.nota ? '' : ' vazia'}`}>{v.nota || t('assoc.semAnotacao')}</span>}
        <span className="assoc-alca" aria-hidden="true" />
      </div>
    </>
  )
}

export const ArestaAssocMemo = memo(Aresta)
