// Escolha do tema e das cores (guardadas separadamente para o claro e o escuro).

import { useState } from 'react'
import { VARS_TEMA, type ModoTema, type Tema } from '../estado/mesa.ts'
import { corAtual, modoEfetivo } from '../tema.ts'
import { Dialogo } from './Dialogo.tsx'

const MODOS: [ModoTema, string][] = [
  ['sistema', 'Igual ao sistema'],
  ['claro', 'Claro'],
  ['escuro', 'Escuro'],
]

export function DialogoTema({ tema, aoMudar, aoFechar }: { tema: Tema; aoMudar: (t: Tema) => void; aoFechar: () => void }) {
  const efetivo = modoEfetivo(tema.modo)
  // Lê as cores na tela depois que o tema foi aplicado (muda a cada troca de modo).
  const [, redesenhar] = useState(0)
  const cores = Object.fromEntries(VARS_TEMA.map(([nome]) => [nome, tema.cores[efetivo][nome] ?? corAtual(nome)]))

  const mudarModo = (modo: ModoTema) => {
    aoMudar({ ...tema, modo })
    requestAnimationFrame(() => redesenhar((n) => n + 1))
  }
  const mudarCor = (nome: string, cor: string) =>
    aoMudar({ ...tema, cores: { ...tema.cores, [efetivo]: { ...tema.cores[efetivo], [nome]: cor } } })
  const restaurar = () => {
    aoMudar({ ...tema, cores: { ...tema.cores, [efetivo]: {} } })
    requestAnimationFrame(() => redesenhar((n) => n + 1))
  }

  return (
    <Dialogo titulo="Tema" aoFechar={aoFechar}>
      <div className="seg">
        {MODOS.map(([m, nome]) => (
          <button key={m} className="btn" aria-pressed={tema.modo === m} onClick={() => mudarModo(m)}>
            {nome}
          </button>
        ))}
      </div>
      <p className="d-rot">Cores do tema {efetivo === 'escuro' ? 'escuro' : 'claro'}</p>
      <div className="cores-tema">
        {VARS_TEMA.map(([nome, rotulo]) => (
          <label key={nome}>
            <span>{rotulo}</span>
            <input type="color" value={cores[nome]} onChange={(e) => mudarCor(nome, e.target.value)} />
          </label>
        ))}
      </div>
      <p className="d-dica">As cores ficam guardadas separadamente para o tema claro e o escuro.</p>
      <div className="d-acoes">
        <button className="btn" onClick={restaurar}>
          Restaurar cores padrão
        </button>
        <button className="btn primario" onClick={aoFechar}>
          Pronto
        </button>
      </div>
    </Dialogo>
  )
}
