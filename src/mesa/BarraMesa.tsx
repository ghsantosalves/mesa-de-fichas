// Itens da lateral que agem sobre a mesa: "Nova área", "Recolher/Expandir todas"
// e "Mapa" (arrumar pelas relações), com a volta à arrumação anterior.

import { useState } from 'react'
import { useReactFlow, useStore } from '@xyflow/react'
import { ChevronsDownUp, ChevronsUpDown, SquareDashed, Undo2, Waypoints } from 'lucide-react'
import { mesa } from '../estado/mesa.ts'
import { mudarFichas, novaArea, type NoMesa } from './operacoes.ts'
import { arrumarComoMapa, desfazerMapa } from './mapa.ts'
import { VER_TUDO } from './opcoes.ts'
import { Item } from '../Lateral.tsx'
import { t } from '../i18n.ts'

type Props = {
  colecao: string
  avisar: (texto: string) => void
  /** No recorte, o Mapa e a volta ficam desligados (o recorte não mexe na arrumação). */
  emRecorte: boolean
}

export function BarraMesa({ colecao, avisar, emRecorte }: Props) {
  const rf = useReactFlow<NoMesa>()
  // Força redesenhar depois de fazer ou desfazer o mapa (o mapa é guardado por coleção).
  const [, redesenhar] = useState(0)
  const temMapa = !!mesa.mapas[colecao]
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
  // Margem maior: as caixas das associações ficam fora das fichas e também devem aparecer.
  const enquadrar = () => setTimeout(() => rf.fitView({ ...VER_TUDO, padding: 0.22, duration: 300 }), 80)
  const mapa = async () => {
    if (!(await arrumarComoMapa(rf))) return avisar(t('aviso.mapaPoucas'))
    redesenhar((n) => n + 1)
    enquadrar()
    avisar(t('aviso.mapa'))
  }
  const voltar = () => {
    desfazerMapa(rf)
    redesenhar((n) => n + 1)
    enquadrar()
  }

  return (
    <>
      <Item icone={SquareDashed} nome={t('barra.novaArea')} acao={() => novaArea(rf, colecao)} />
      <Item
        icone={todasRecolhidas ? ChevronsUpDown : ChevronsDownUp}
        nome={todasRecolhidas ? t('barra.expandirTodas') : t('barra.recolherTodas')}
        acao={alternarTodas}
      />
      <Item icone={Waypoints} nome={t('barra.mapa')} dica={t('barra.mapaDica')} acao={mapa} desligado={emRecorte} />
      {temMapa && <Item icone={Undo2} nome={t('barra.desfazerMapa')} acao={voltar} desligado={emRecorte} />}
    </>
  )
}
