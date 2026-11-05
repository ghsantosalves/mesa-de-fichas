// Botões da barra que agem sobre a mesa: "Nova área" e "Recolher/Expandir todas".

import { useReactFlow, useStore } from '@xyflow/react'
import { mudarFichas, novaArea, type NoMesa } from './operacoes.ts'

export function BarraMesa({ colecao }: { colecao: string }) {
  const rf = useReactFlow<NoMesa>()
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

  return (
    <>
      <button className="btn" onClick={() => novaArea(rf, colecao)}>
        Nova área
      </button>
      <button className="btn" onClick={alternarTodas}>
        {todasRecolhidas ? 'Expandir todas' : 'Recolher todas'}
      </button>
    </>
  )
}
