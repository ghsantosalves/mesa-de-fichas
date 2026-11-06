// Legenda das relações: cada tipo de relação com sua cor e quantas associações
// visíveis o usam. Clicar num tipo esconde ou mostra essas associações.
// Também lembra qual ficha está em foco e como sair do foco.

import { useState } from 'react'
import { useStore } from '@xyflow/react'
import type { DadosAresta } from './assoc.ts'
import type { NoMesa } from './operacoes.ts'
import { chaveRelacao, corDaRelacao } from './relacoes.ts'
import { comparar, t } from '../i18n.ts'

type Props = {
  ocultas: string[]
  aoMudarOcultas: (o: string[]) => void
  foco: string | null
  aoSairDoFoco: () => void
}

export function Legenda({ ocultas, aoMudarOcultas, foco, aoSairDoFoco }: Props) {
  const [aberta, setAberta] = useState(true)
  // Relações das associações visíveis, como texto (para não redesenhar a cada movimento).
  const texto = useStore((s) => {
    const visiveis = new Set(s.nodes.filter((n) => !n.hidden).map((n) => n.id))
    return s.edges
      .filter((e) => visiveis.has(e.source) && visiveis.has(e.target))
      // '#' na frente: uma relação vazia ("a definir") também conta.
      .map((e) => '#' + ((e.data as DadosAresta | undefined)?.assoc.rel ?? '').trim())
      .join('\n')
  })
  const nomeFoco = useStore((s) => {
    const n = foco ? (s.nodes.find((x) => x.id === foco) as NoMesa | undefined) : undefined
    return n?.type === 'ficha' ? n.data.ficha.autorAno : ''
  })

  const grupos = new Map<string, { rel: string; n: number }>()
  for (const item of texto ? texto.split('\n') : []) {
    const rel = item.slice(1)
    const k = chaveRelacao(rel)
    const g = grupos.get(k)
    if (g) g.n++
    else grupos.set(k, { rel, n: 1 })
  }
  if (!grupos.size && !foco) return null
  const lista = [...grupos.entries()].sort((a, b) => b[1].n - a[1].n || comparar(a[1].rel, b[1].rel))
  const alternar = (k: string) => aoMudarOcultas(ocultas.includes(k) ? ocultas.filter((x) => x !== k) : [...ocultas, k])

  return (
    <aside className="legenda" aria-label={t('leg.rotulo')}>
      {foco && (
        <div className="leg-foco">
          <span>{t('leg.foco', { f: nomeFoco })}</span>
          <button className="btn" onClick={aoSairDoFoco}>
            {t('leg.sairFoco')}
          </button>
        </div>
      )}
      {grupos.size > 0 && (
        <>
          <button className="leg-titulo" aria-expanded={aberta} onClick={() => setAberta(!aberta)}>
            {aberta ? '▾' : '▸'} {t('leg.titulo', { n: lista.length })}
          </button>
          {aberta && (
            <>
              <ul className="leg-lista">
                {lista.map(([k, g]) => {
                  const escondida = ocultas.includes(k)
                  return (
                    <li key={k}>
                      <button
                        className={`leg-item${escondida ? ' escondida' : ''}`}
                        aria-pressed={!escondida}
                        title={escondida ? t('leg.mostrar') : t('leg.esconder')}
                        onClick={() => alternar(k)}
                      >
                        <span className="leg-cor" style={{ background: corDaRelacao(g.rel) }} aria-hidden="true" />
                        <span className="leg-nome">{g.rel || t('assoc.aDefinir')}</span>
                        <span className="leg-n">{g.n}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {ocultas.length > 0 && (
                <button className="btn leg-todas" onClick={() => aoMudarOcultas([])}>
                  {t('leg.mostrarTodas')}
                </button>
              )}
            </>
          )}
        </>
      )}
    </aside>
  )
}
