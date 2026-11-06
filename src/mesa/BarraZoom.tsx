// Zoom e "Ver tudo", na lateral. Aberta: − 97% + e "Ver tudo"; recolhida: só ícones.

import { useReactFlow, useViewport } from '@xyflow/react'
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import { VER_TUDO } from './opcoes.ts'
import { Item } from '../Lateral.tsx'
import { useLateral } from '../lateralContexto.ts'
import { t } from '../i18n.ts'

export function BarraZoom() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const { zoom } = useViewport()
  const { aberta } = useLateral()
  return (
    <>
      {aberta ? (
        <div className="lt-zoom">
          <button className="btn icone" onClick={() => zoomOut()} aria-label={t('barra.diminuirZoom')} title={t('barra.diminuirZoom')}>
            <ZoomOut size={17} aria-hidden="true" />
          </button>
          <span className="nivel">{Math.round(zoom * 100)}%</span>
          <button className="btn icone" onClick={() => zoomIn()} aria-label={t('barra.aumentarZoom')} title={t('barra.aumentarZoom')}>
            <ZoomIn size={17} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <Item icone={ZoomIn} nome={t('barra.aumentarZoom')} acao={() => zoomIn()} manterAberta />
          <Item icone={ZoomOut} nome={t('barra.diminuirZoom')} acao={() => zoomOut()} manterAberta />
        </>
      )}
      <Item icone={Maximize} nome={t('barra.verTudo')} acao={() => fitView(VER_TUDO)} />
    </>
  )
}
