// Faixa "Novas fichas": fichas que chegaram do Zotero e ainda não têm lugar na mesa.
// Arraste uma ficha para a mesa, clique em "Colocar" ou em "Colocar todas".

import { useState } from 'react'
import type { Ficha } from '../zotero/biblioteca.ts'
import type { Posicao } from '../estado/mesa.ts'
import { t } from '../i18n.ts'

/** Tipo de dado usado ao arrastar uma ficha da faixa para a mesa. */
export const TIPO_ARRASTE = 'application/x-mesa-ficha'

type Props = {
  novas: Ficha[]
  emOutrasColecoes: number
  aoColocar: (fichas: Ficha[], ponto?: Posicao) => void
}

export function FaixaNovas({ novas, emOutrasColecoes, aoColocar }: Props) {
  const [aberta, setAberta] = useState(true)
  return (
    <aside className="faixa-novas" aria-label={t('novas.rotulo')}>
      <div className="fn-topo">
        <button className="fn-titulo" aria-expanded={aberta} onClick={() => setAberta(!aberta)}>
          {aberta ? '▾' : '▸'} {t('novas.titulo', { n: novas.length })}
        </button>
        {novas.length > 1 && aberta && (
          <button className="btn" onClick={() => aoColocar(novas)}>
            {t('novas.colocarTodas')}
          </button>
        )}
      </div>
      {aberta && (
        <>
          <p className="fn-dica">
            {novas.length ? t('novas.dica') : t('novas.nenhuma')}
            {emOutrasColecoes > 0 && t('novas.outras', { n: emOutrasColecoes })}
          </p>
          <ul className="fn-lista">
            {novas.map((f) => (
              <li
                key={f.chave}
                className="fn-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(TIPO_ARRASTE, f.chave)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                title={t('novas.arraste')}
              >
                <div>
                  <div className="fn-autor">{f.autorAno}</div>
                  {f.obra && <div className="fn-obra">{f.obra}</div>}
                </div>
                <button className="btn" onClick={() => aoColocar([f])}>
                  {t('novas.colocar')}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
