// Cartão de uma ficha na mesa (um "nó" do React Flow).

import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { linkZotero, type Ficha } from '../zotero/biblioteca.ts'

export type DadosFicha = { ficha: Ficha; colecoes: string[] }
export type NoFicha = Node<DadosFicha, 'ficha'>

export const LARGURA_FICHA = 300

function link(url: string, texto: string) {
  if (!/^https?:\/\//.test(url)) return null
  return (
    <a className="nodrag" href={url} target="_blank" rel="noopener noreferrer">
      {texto}
    </a>
  )
}

function CartaoNaMesa({ data, selected, dragging }: NodeProps<NoFicha>) {
  const f = data.ficha
  const campo = (rotulo: string, v: string) =>
    v && (
      <div>
        <dt>{rotulo}</dt>
        <dd>{v}</dd>
      </div>
    )
  return (
    <article
      className={`ficha-mesa${selected ? ' selecionada' : ''}${dragging ? ' arrastando' : ''}`}
      style={{ width: LARGURA_FICHA }}
    >
      <div className="autor">{f.autorAno}</div>
      {f.obra && <div className="obra">{f.obra}</div>}
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
      </div>
    </article>
  )
}

export const NoFichaMemo = memo(CartaoNaMesa)
