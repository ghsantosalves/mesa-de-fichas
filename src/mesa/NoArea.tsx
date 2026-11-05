// Área da mesa: retângulo tracejado com título editável, que se arrasta pelo
// cabeçalho (levando as fichas de dentro) e se redimensiona pelo canto.

import { memo, useEffect, useRef, useState } from 'react'
import { NodeResizeControl, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { ALTURA_MIN_AREA, LARGURA_MIN_AREA, type Area } from '../estado/mesa.ts'
import { mudarArea, removerArea, type NoMesa } from './operacoes.ts'
import { t } from '../i18n.ts'

export type DadosArea = { area: Area; nova?: boolean }
export type NoArea = Node<DadosArea, 'area'>

function AreaNaMesa({ data }: NodeProps<NoArea>) {
  const rf = useReactFlow<NoMesa>()
  const a = data.area
  const titulo = useRef<HTMLInputElement>(null)
  const [confirmar, setConfirmar] = useState(false)

  // Área recém-criada: já abre com o título selecionado para digitar.
  useEffect(() => {
    if (data.nova) {
      titulo.current?.focus()
      titulo.current?.select()
    }
  }, [data.nova])

  useEffect(() => {
    if (!confirmar) return
    const t = setTimeout(() => setConfirmar(false), 3000)
    return () => clearTimeout(t)
  }, [confirmar])

  return (
    <section className="area">
      <div className="area-cab" title={t('area.arrastar')}>
        <span className="pega" aria-hidden="true">
          ⠿
        </span>
        <input
          ref={titulo}
          className="area-titulo nodrag"
          value={a.titulo}
          size={Math.max(6, a.titulo.length + 1)}
          spellCheck={false}
          aria-label={t('area.titulo')}
          onChange={(e) => mudarArea(rf, a.id, { titulo: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
          }}
        />
        <button
          className={`area-x nodrag${confirmar ? ' confirmar' : ''}`}
          aria-label={t('area.remover')}
          onClick={() => (confirmar ? removerArea(rf, a.id) : setConfirmar(true))}
        >
          {confirmar ? t('area.confirma') : '×'}
        </button>
      </div>
      <NodeResizeControl
        position="bottom-right"
        minWidth={LARGURA_MIN_AREA}
        minHeight={ALTURA_MIN_AREA}
        className="area-alca"
        onResizeEnd={(_, p) => mudarArea(rf, a.id, { x: p.x, y: p.y, w: p.width, h: p.height })}
      />
    </section>
  )
}

export const NoAreaMemo = memo(AreaNaMesa)
