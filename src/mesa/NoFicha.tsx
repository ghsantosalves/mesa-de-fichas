// Cartão de uma ficha na mesa (um "nó" do React Flow).

import { memo, useContext, useMemo, useState } from 'react'
import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { Contexto, normalizar } from './contexto.ts'
import { linkZotero, type Ficha } from '../zotero/biblioteca.ts'
import { CAMPOS, CORES, NOMES_CAMPOS, type Campo, type Cor } from '../estado/mesa.ts'
import { mudarFichas, type NoMesa } from './operacoes.ts'
import { tirarFichaDaMesa, type ArestaAssoc } from './assoc.ts'

export type DadosFicha = {
  ficha: Ficha
  colecoes: string[]
  cor?: Cor
  recolhida: boolean
  ocultos: Campo[]
  /** A ficha sumiu do Zotero: mostra o último conteúdo conhecido e a opção de tirar da mesa. */
  removida?: { em: string; associacoes: number }
}
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

/** Cartão de uma ficha que sumiu do Zotero. */
function CartaoRemovida({ id, data }: NodeProps<NoFicha>) {
  const rf = useReactFlow<NoMesa, ArestaAssoc>()
  const [confirmar, setConfirmar] = useState(false)
  const r = data.removida!
  const f = data.ficha
  const n = r.associacoes
  return (
    <article className="ficha-mesa removida" style={{ width: LARGURA_FICHA }}>
      <Handle type="target" position={Position.Top} isConnectable={false} className="ponto-ligacao" />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="ponto-ligacao" />
      <div className="faixa-removida">Removida do Zotero</div>
      <div className="autor">{f.autorAno}</div>
      {f.obra && <div className="obra">{f.obra}</div>}
      {f.tese && <p className="tese-removida">{f.tese}</p>}
      <p className="explica-removida">
        A nota foi apagada, foi para a lixeira ou perdeu a tag “ficha”
        {r.em ? ` (notado em ${new Date(r.em).toLocaleDateString('pt-BR')})` : ''}. Se ela voltar ao Zotero, a ficha
        volta ao normal aqui.{' '}
        {n === 1 ? 'A associação dela continua guardada.' : n > 1 ? `As ${n} associações dela continuam guardadas.` : ''}
      </p>
      <button
        className={`btn nodrag${confirmar ? ' perigo' : ''}`}
        onClick={() => (confirmar ? tirarFichaDaMesa(rf, id) : setConfirmar(true))}
        onBlur={() => setConfirmar(false)}
      >
        {confirmar
          ? n > 0
            ? `Clique de novo: tira a ficha e ${n === 1 ? 'a associação' : `as ${n} associações`}`
            : 'Clique de novo para tirar'
          : 'Tirar da mesa'}
      </button>
    </article>
  )
}

function CartaoNaMesa(props: NodeProps<NoFicha>) {
  if (props.data.removida) return <CartaoRemovida {...props} />
  return <CartaoNormal {...props} />
}

function CartaoNormal({ id, data, selected, dragging }: NodeProps<NoFicha>) {
  const rf = useReactFlow<NoMesa>()
  const { escolhida, pontas, busca } = useContext(Contexto)
  const [menu, setMenu] = useState(false)
  const f = data.ficha
  // Busca em todos os campos, inclusive o uso, mesmo os ocultos.
  const textoBusca = useMemo(
    () =>
      normalizar(
        [f.titulo, f.ref, f.tese, f.conceitos.join(' '), f.lembrar, f.dialogos.join(' '), f.usos.join(' ')].join(' '),
      ),
    [f],
  )
  const apagada = busca !== '' && !textoBusca.includes(busca)
  const alternar = () => mudarFichas(rf, [id], { recolhida: !data.recolhida })
  const ve = (c: Campo) => !data.ocultos.includes(c)
  const alternarCampo = (c: Campo) =>
    mudarFichas(rf, [id], { ocultos: ve(c) ? [...data.ocultos, c] : data.ocultos.filter((x) => x !== c) })
  const campo = (c: Campo, v: string) =>
    v &&
    ve(c) && (
      <div>
        <dt>{NOMES_CAMPOS[c]}</dt>
        <dd>{v}</dd>
      </div>
    )

  return (
    <article
      className={`ficha-mesa${data.recolhida ? ' recolhida' : ''}${selected ? ' selecionada' : ''}${dragging ? ' arrastando' : ''}${escolhida === id ? ' escolhida' : ''}${pontas.includes(id) ? ' ponta' : ''}${apagada ? ' apagada' : ''}`}
      style={{
        width: data.recolhida ? LARGURA_RECOLHIDA : LARGURA_FICHA,
        borderLeftColor: data.cor ? `var(--c-${data.cor})` : undefined,
      }}
      onDoubleClick={(e) => {
        if (!(e.target as HTMLElement).closest('button, a')) alternar()
      }}
    >
      {/* Pontos de ligação invisíveis: as setas são calculadas de borda a borda. */}
      <Handle type="target" position={Position.Top} isConnectable={false} className="ponto-ligacao" />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="ponto-ligacao" />
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
            {campo('tese', f.tese)}
            {campo('conceitos', f.conceitos.join(' · '))}
            {campo('lembrar', f.lembrar)}
            {campo('dialogos', f.dialogos.join(' · '))}
            {f.usos.length > 0 && ve('usos') && (
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
          {f.ref && ve('ref') && <p className="ref">{f.ref}</p>}
          <div className="pe">
            <span className="bibs">
              {ve('colecoes') && data.colecoes.join(' · ')}
              {data.ocultos.length > 0 && (
                <span className="ocultos-aviso">
                  {ve('colecoes') && ' · '}
                  {data.ocultos.length === 1 ? '1 campo oculto' : `${data.ocultos.length} campos ocultos`}
                </span>
              )}
            </span>
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
              <fieldset className="campos-visiveis">
                <legend>Campos visíveis nesta ficha</legend>
                {CAMPOS.map((c) => (
                  <label key={c}>
                    <input type="checkbox" checked={ve(c)} onChange={() => alternarCampo(c)} />
                    {NOMES_CAMPOS[c]}
                  </label>
                ))}
              </fieldset>
            </div>
          )}
        </>
      )}
    </article>
  )
}

export const NoFichaMemo = memo(CartaoNaMesa)
