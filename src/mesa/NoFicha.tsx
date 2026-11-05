// Cartão de uma ficha na mesa (um "nó" do React Flow).

import { memo, useContext, useMemo, useState } from 'react'
import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { Contexto, normalizar } from './contexto.ts'
import { linkZotero, type Ficha } from '../zotero/biblioteca.ts'
import { CAMPOS, CORES, nomeCampo, type Campo, type CampoGrifo, type Cor, type Grifo } from '../estado/mesa.ts'
import { data as dataNoIdioma, t, tn, type Chave } from '../i18n.ts'
import { mudarFichas, type NoMesa } from './operacoes.ts'
import { tirarFichaDaMesa, type ArestaAssoc } from './assoc.ts'

export type DadosFicha = {
  ficha: Ficha
  colecoes: string[]
  cor?: Cor
  recolhida: boolean
  ocultos: Campo[]
  grifos?: Grifo[]
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

/**
 * Mostra um texto com trechos grifados. Se o texto mudou no Zotero, o grifo é
 * procurado pelo trecho; se o trecho não existe mais, o grifo não aparece.
 */
function TextoGrifado({
  texto,
  grifos,
  grifando,
  aoTirar,
}: {
  texto: string
  grifos: Grifo[]
  grifando: boolean
  aoTirar: (g: Grifo) => void
}) {
  if (!grifos.length) return <>{texto}</>
  const posicionados = grifos
    .map((g) => {
      if (texto.slice(g.inicio, g.fim) === g.trecho) return { g, i: g.inicio, f: g.fim }
      const i = texto.indexOf(g.trecho)
      return i >= 0 ? { g, i, f: i + g.trecho.length } : null
    })
    .filter((x): x is { g: Grifo; i: number; f: number } => !!x)
    .sort((a, b) => a.i - b.i)
  const partes: React.ReactNode[] = []
  let pos = 0
  for (const { g, i, f } of posicionados) {
    if (i < pos) continue // sobreposto a outro: ignora
    if (i > pos) partes.push(texto.slice(pos, i))
    partes.push(
      <mark
        key={`${i}-${f}`}
        className={`grifo${grifando ? ' removivel' : ''}`}
        style={{ backgroundColor: `color-mix(in srgb, ${g.cor} 60%, transparent)` }}
        title={grifando ? t('ficha.tirarGrifo') : undefined}
        onClick={(e) => {
          if (!grifando) return
          e.stopPropagation()
          aoTirar(g)
        }}
      >
        {texto.slice(i, f)}
      </mark>,
    )
    pos = f
  }
  if (pos < texto.length) partes.push(texto.slice(pos))
  return <>{partes}</>
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
      <div className="faixa-removida">{t('rem.faixa')}</div>
      <div className="autor">{f.autorAno}</div>
      {f.obra && <div className="obra">{f.obra}</div>}
      {f.tese && <p className="tese-removida">{f.tese}</p>}
      <p className="explica-removida">
        {t('rem.explica', { quando: r.em ? t('rem.quando', { data: dataNoIdioma(new Date(r.em)) }) : '' })}{' '}
        {n > 0 ? tn('rem.assoc', n) : ''}
      </p>
      <button
        className={`btn nodrag${confirmar ? ' perigo' : ''}`}
        onClick={() => (confirmar ? tirarFichaDaMesa(rf, id) : setConfirmar(true))}
        onBlur={() => setConfirmar(false)}
      >
        {confirmar
          ? n > 0
            ? tn('rem.confirma', n)
            : t('rem.confirma')
          : t('rem.tirar')}
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
  const { escolhida, pontas, busca, ferramenta } = useContext(Contexto)
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
  const grifos = data.grifos ?? []
  // Ao grifar, o mouse no texto seleciona: a mesa não deve arrastar nem andar a partir dali.
  const classeTexto = ferramenta === 'grifar' ? 'nopan nodrag' : undefined
  const tirarGrifo = (g: Grifo) => mudarFichas(rf, [id], { grifos: grifos.filter((x) => x !== g) })
  /** Texto de um campo com os trechos grifados. */
  const comGrifos = (c: CampoGrifo, texto: string) => (
    <TextoGrifado texto={texto} grifos={grifos.filter((g) => g.campo === c)} grifando={ferramenta === 'grifar'} aoTirar={tirarGrifo} />
  )
  const campo = (c: Campo & CampoGrifo, v: string) =>
    v &&
    ve(c) && (
      <div>
        <dt>{nomeCampo(c)}</dt>
        <dd data-campo={c} className={classeTexto}>
          {comGrifos(c, v)}
        </dd>
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
        aria-label={data.recolhida ? t('ficha.expandirFicha') : t('ficha.recolherFicha')}
        aria-expanded={!data.recolhida}
        title={data.recolhida ? t('ficha.expandir') : t('ficha.recolher')}
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
                <dt>{nomeCampo('usos')}</dt>
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
          {f.ref && ve('ref') && (
            <p className={`ref ${classeTexto ?? ''}`} data-campo="ref">
              {comGrifos('ref', f.ref)}
            </p>
          )}
          <div className="pe">
            <span className="bibs">
              {ve('colecoes') && data.colecoes.join(' · ')}
              {data.ocultos.length > 0 && (
                <span className="ocultos-aviso">
                  {ve('colecoes') && ' · '}
                  {tn('ficha.ocultos', data.ocultos.length)}
                </span>
              )}
            </span>
            {link(f.video, t('ficha.video'))}
            {link(f.fichamento, t('ficha.fichamento'))}
            <a className="nodrag" href={linkZotero(f)}>
              {t('ficha.abrirZotero')}
            </a>
            <button
              className="mais-btn nodrag"
              aria-label={t('ficha.opcoes')}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              ⋯
            </button>
          </div>
          {menu && (
            <div className="opcoes nodrag">
              <div className="cores" role="group" aria-label={t('ficha.corFicha')}>
                {([null, ...CORES] as (Cor | null)[]).map((c) => (
                  <button
                    key={c ?? 'nenhuma'}
                    className={`ponto ${c ? `c-${c}` : 'c-nenhuma'}${(data.cor ?? null) === c ? ' ativo' : ''}`}
                    aria-label={c ? t(`cor.${c}` as Chave) : t('ficha.semCor')}
                    title={c ? t(`cor.${c}` as Chave) : t('ficha.semCor')}
                    onClick={() => mudarFichas(rf, [id], { cor: c })}
                  />
                ))}
              </div>
              <fieldset className="campos-visiveis">
                <legend>{t('ficha.camposVisiveis')}</legend>
                {CAMPOS.map((c) => (
                  <label key={c}>
                    <input type="checkbox" checked={ve(c)} onChange={() => alternarCampo(c)} />
                    {nomeCampo(c)}
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
