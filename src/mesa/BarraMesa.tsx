// Botões da barra que agem sobre a mesa: "Nova área", "Recolher/Expandir todas"
// e "Mapa" (arrumar pelas relações), com a volta à arrumação anterior.

import { useState } from 'react'
import { useReactFlow, useStore } from '@xyflow/react'
import { Undo2, Waypoints } from 'lucide-react'
import { mesa } from '../estado/mesa.ts'
import { mudarFichas, novaArea, type NoMesa } from './operacoes.ts'
import { arrumarComoMapa, desfazerMapa } from './mapa.ts'
import { VER_TUDO } from './opcoes.ts'
import { t } from '../i18n.ts'

export function BarraMesa({ colecao, avisar }: { colecao: string; avisar: (texto: string) => void }) {
  const rf = useReactFlow<NoMesa>()
  const [temMapa, setTemMapa] = useState(() => !!mesa.antesDoMapa)
  // Só redesenha quando muda a resposta, não a cada movimento na mesa.
  const todasRecolhidas = useStore((s) => {
    const vis = s.nodes.filter((n) => n.type === 'ficha' && !n.hidden)
    return vis.length > 0 && vis.every((n) => (n as NoMesa & { type: 'ficha' }).data.recolhida)
  })

  const alternarTodas = () => {
    const visiveis = rf.getNodes().filter((n) => n.type === 'ficha' && !n.hidden)
    mudarFichas(
      rf,
      visiveis.map((n) => n.id),
      { recolhida: !todasRecolhidas },
    )
  }
  // Espera as fichas serem redesenhadas (recolhidas) antes de enquadrar.
  const enquadrar = () => setTimeout(() => rf.fitView({ ...VER_TUDO, duration: 300 }), 80)
  const mapa = () => {
    if (!arrumarComoMapa(rf)) return avisar(t('aviso.mapaPoucas'))
    setTemMapa(true)
    enquadrar()
    avisar(t('aviso.mapa'))
  }
  const voltar = () => {
    desfazerMapa(rf)
    setTemMapa(false)
    enquadrar()
  }

  return (
    <>
      <button className="btn" onClick={() => novaArea(rf, colecao)}>
        {t('barra.novaArea')}
      </button>
      <button className="btn" onClick={alternarTodas}>
        {todasRecolhidas ? t('barra.expandirTodas') : t('barra.recolherTodas')}
      </button>
      <button className="btn com-icone" title={t('barra.mapaDica')} onClick={mapa}>
        <Waypoints size={16} aria-hidden="true" />
        {t('barra.mapa')}
      </button>
      {temMapa && (
        <button className="btn icone" title={t('barra.desfazerMapa')} aria-label={t('barra.desfazerMapa')} onClick={voltar}>
          <Undo2 size={16} aria-hidden="true" />
        </button>
      )}
    </>
  )
}
