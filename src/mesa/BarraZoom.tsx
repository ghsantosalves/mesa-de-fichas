// Botões de zoom e "Ver tudo", na barra do topo.

import { useReactFlow, useViewport } from '@xyflow/react'
import { VER_TUDO } from './opcoes.ts'

export function BarraZoom() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const { zoom } = useViewport()
  return (
    <div className="grupo zoom">
      <button className="btn" onClick={() => zoomOut()} aria-label="Diminuir zoom">
        −
      </button>
      <span className="nivel">{Math.round(zoom * 100)}%</span>
      <button className="btn" onClick={() => zoomIn()} aria-label="Aumentar zoom">
        +
      </button>
      <button className="btn" onClick={() => fitView(VER_TUDO)}>
        Ver tudo
      </button>
    </div>
  )
}
