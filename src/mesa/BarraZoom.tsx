// Botões de zoom e "Ver tudo", na barra do topo.

import { useReactFlow, useViewport } from '@xyflow/react'
import { VER_TUDO } from './opcoes.ts'
import { t } from '../i18n.ts'

export function BarraZoom() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const { zoom } = useViewport()
  return (
    <div className="grupo zoom">
      <button className="btn" onClick={() => zoomOut()} aria-label={t('barra.diminuirZoom')}>
        −
      </button>
      <span className="nivel">{Math.round(zoom * 100)}%</span>
      <button className="btn" onClick={() => zoomIn()} aria-label={t('barra.aumentarZoom')}>
        +
      </button>
      <button className="btn" onClick={() => fitView(VER_TUDO)}>
        {t('barra.verTudo')}
      </button>
    </div>
  )
}
