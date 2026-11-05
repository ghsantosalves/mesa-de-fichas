// Cartão de uma ficha na mesa (um "nó" do React Flow).

import { memo, useState } from 'react'
import { useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { linkZotero, type Ficha } from '../zotero/biblioteca.ts'
import { CORES, type Cor } from '../estado/mesa.ts'
import { mudarFichas, type NoMesa } from './operacoes.ts'

export type DadosFicha = { ficha: Ficha; colecoes: string[]; cor?: Cor; recolhida: boolean }
export type NoFicha = Node<DadosFicha, 'ficha'>

export const LARGURA_FICHA = 300
export const LARGURA_RECOLHIDA = 240

function link(url: string, texto: string) {
  if (!/^https?:\/\//.test(url)) return null
  return (
    <a className="nodrag" href={url} target="_blank" rel="noopener noreferrer">
      {texto}
    </a>
  )
}

function CartaoNaMesa({ id, data, selected, dragging }: NodeProps<NoFicha>) {
  const rf = useReactFlow<NoMesa>()
  const [menu, setMenu] = useState(false)
  const f = data.ficha
  const alternar = () => mudarFichas(rf, [id], { recolhida: !data.recolhida })
  const campo = (rotulo: string, v: string) =>
    v && (
      <div>
        <dt>{rotulo}</dt>
        <dd>{v}</dd>
      </div>
    )

  return (
    <article
      className={`ficha-mesa${data.recolhida ? ' recolhida' : ''}${selected ? ' selecionada' : ''}${dragging ? ' arrastando' : ''}`}
      style={{
        width: data.recolhida ? LARGURA_RECOLHIDA : LARGURA_FICHA,
        borderLeftColor: data.cor ? `var(--c-${data.cor})` : undefined,
      }}
      onDoubleClick={(e) => {
        if (!(e.target as HTMLElement).closest('button, a')) alternar()
      }}
    >
      <button
        className="recolher nodrag"
        onClick={alternar}
        aria-label={data.recolhida ? 'Expandir ficha' : 'Recolher ficha'}
        aria-expanded={!data.recolhida}
        title={data.recolhida ? 'Expandir' : 'Recolher'}
      >
        {data.recolhida ? '▸' : '▾'}
      </button>
      <div className="autor">{f.autorAno}</div>
      {f.obra && <div className="obra">{f.obra}</div>}
      {!data.recolhida && (
        <>
          <dl className="campos">
            {campo('Tese', f.tese)}
            {campo('Conceitos', f.conceitos.join(' · '))}
            {campo('Para lembrar', f.lembrar)}
            {campo('Diálogos', f.dialogos.join(' · '))}
            {f.usos.length > 0 && (
              <div>
                <dt>Uso no projeto</dt>
                <dd className="tags">
                  {f.usos.map((u) => (
                    <span className="tag" key={u}>
                      {u}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
          {f.ref && <p className="ref">{f.ref}</p>}
          <div className="pe">
            <span className="bibs">{data.colecoes.join(' · ')}</span>
            {link(f.video, 'Vídeo da aula')}
            {link(f.fichamento, 'Fichamento completo')}
            <a className="nodrag" href={linkZotero(f)}>
              Abrir no Zotero
            </a>
            <button
              className="mais-btn nodrag"
              aria-label="Opções da ficha"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              ⋯
            </button>
          </div>
          {menu && (
            <div className="opcoes nodrag">
              <div className="cores" role="group" aria-label="Cor da ficha">
                {([null, ...CORES] as (Cor | null)[]).map((c) => (
                  <button
                    key={c ?? 'nenhuma'}
                    className={`ponto ${c ? `c-${c}` : 'c-nenhuma'}${(data.cor ?? null) === c ? ' ativo' : ''}`}
                    aria-label={c ?? 'sem cor'}
                    title={c ?? 'sem cor'}
                    onClick={() => mudarFichas(rf, [id], { cor: c })}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </article>
  )
}

export const NoFichaMemo = memo(CartaoNaMesa)
