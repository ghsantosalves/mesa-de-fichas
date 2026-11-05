// Painel lateral de uma associação: as duas fichas, a relação (texto livre com
// sugestões), a anotação e as ações (inverter, recentralizar a caixa, remover).

import { useEffect, useRef, useState } from 'react'
import { useReactFlow, useStore } from '@xyflow/react'
import { mesa } from '../estado/mesa.ts'
import type { Biblioteca, Ficha } from '../zotero/biblioteca.ts'
import {
  inverterAssociacao,
  mudarAssociacao,
  removerAssociacao,
  RELACOES_PADRAO,
  type ArestaAssoc,
  type DadosAresta,
} from './assoc.ts'
import type { NoMesa } from './operacoes.ts'

type Props = {
  bib: Biblioteca
  id: string
  focarRelacao: boolean
  aoFechar: () => void
  avisar: (texto: string) => void
}

export function PainelAssoc({ bib, id, focarRelacao, aoFechar, avisar }: Props) {
  const rf = useReactFlow<NoMesa, ArestaAssoc>()
  const assoc = useStore((s) => (s.edges.find((e) => e.id === id)?.data as DadosAresta | undefined)?.assoc)
  // Relações já usadas em qualquer associação (texto, para não redesenhar à toa).
  const usadas = useStore((s) =>
    s.edges
      .map((e) => (e.data as DadosAresta | undefined)?.assoc.rel.trim() ?? '')
      .filter(Boolean)
      .join('\n'),
  )
  const campoRel = useRef<HTMLInputElement>(null)
  const [confirmar, setConfirmar] = useState(false)

  // Associação nova: cursor já no campo da relação. Espera um instante porque o
  // clique na ficha ainda está sendo tratado pela mesa (que puxa o foco para si).
  useEffect(() => {
    if (!focarRelacao) return
    const t = setTimeout(() => campoRel.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [id, focarRelacao])
  useEffect(() => {
    if (!confirmar) return
    const t = setTimeout(() => setConfirmar(false), 3000)
    return () => clearTimeout(t)
  }, [confirmar])

  if (!assoc) return null
  const fa = bib.fichas.find((f) => f.chave === assoc.a)
  const fb = bib.fichas.find((f) => f.chave === assoc.b)
  const sugestoes = [...new Set([...usadas.split('\n').filter(Boolean), ...RELACOES_PADRAO])]
  const rel = assoc.rel.trim()

  return (
    <aside className="painel" aria-label="Associação entre fichas">
      <div className="p-topo">
        <h2>Associação</h2>
        <button className="btn" onClick={aoFechar}>
          Fechar
        </button>
      </div>
      <MiniFicha f={fa} />
      <div className="p-dir">↓ {rel || 'relação a definir'}</div>
      <MiniFicha f={fb} />

      <label className="p-rot" htmlFor="p-rel">
        Relação
      </label>
      <input
        id="p-rel"
        ref={campoRel}
        className="rel-input"
        list="lista-rels"
        placeholder="Escreva a relação, ex.: retoma o conceito de"
        value={assoc.rel}
        onChange={(e) => mudarAssociacao(rf, id, { rel: e.target.value })}
      />
      <datalist id="lista-rels">
        {sugestoes.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <div className="rels">
        {sugestoes.slice(0, 12).map((r) => (
          <button key={r} className="btn" aria-pressed={r === rel} onClick={() => mudarAssociacao(rf, id, { rel: r })}>
            {r}
          </button>
        ))}
      </div>

      <label className="p-rot" htmlFor="p-nota">
        Anotação
      </label>
      <textarea
        id="p-nota"
        placeholder="O que liga estes dois textos? Ponto de contato, contraste, hipótese de leitura…"
        value={assoc.nota}
        onChange={(e) => mudarAssociacao(rf, id, { nota: e.target.value })}
      />

      <div className="p-acoes">
        <button className="btn" onClick={() => inverterAssociacao(rf, assoc)}>
          Inverter direção
        </button>
        <button className="btn" onClick={() => mudarAssociacao(rf, id, {}, ['dx', 'dy', 'w', 'h'])}>
          Recentralizar caixa
        </button>
        <button
          className="remover"
          onClick={() => {
            if (!confirmar) return setConfirmar(true)
            removerAssociacao(rf, id)
            aoFechar()
            avisar('Associação removida')
          }}
        >
          {confirmar ? 'Clique de novo para remover' : 'Remover associação'}
        </button>
      </div>
    </aside>
  )
}

function MiniFicha({ f }: { f: Ficha | undefined }) {
  if (!f) return <div className="p-f">Ficha não encontrada no Zotero.</div>
  const cor = mesa.fichas[f.chave]?.cor
  return (
    <div className="p-f" style={{ borderLeftColor: cor ? `var(--c-${cor})` : undefined }}>
      <div className="autor">{f.autorAno}</div>
      {f.obra && <div className="obra">{f.obra}</div>}
      {f.tese && <p>{f.tese}</p>}
    </div>
  )
}
