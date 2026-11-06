// Painel lateral de uma associação: as duas fichas, a relação (texto livre com
// sugestões), a anotação e as ações (inverter, recentralizar a caixa, remover).

import { useEffect, useRef, useState } from 'react'
import { useReactFlow, useStore } from '@xyflow/react'
import { associacaoNaColecao, mesa } from '../estado/mesa.ts'
import { comSubcolecoes, type Biblioteca, type Ficha } from '../zotero/biblioteca.ts'
import {
  inverterAssociacao,
  mudarAssociacao,
  removerAssociacao,
  RELACOES_PADRAO,
  type ArestaAssoc,
  type DadosAresta,
} from './assoc.ts'
import type { NoMesa } from './operacoes.ts'
import { t } from '../i18n.ts'

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

  // Coleções com fichas, em árvore (como no seletor da barra), para escolher onde a associação vale.
  const colecoes: { chave: string; nome: string; nivel: number }[] = []
  const percorrer = (pai: string | null, nivel: number) => {
    for (const c of bib.colecoes.filter((x) => x.pai === pai)) {
      const chaves = comSubcolecoes(c.chave, bib.colecoes)
      const temFichas = bib.fichas.some((f) => f.colecoes.some((k) => chaves.has(k)))
      if (temFichas || c.chave === assoc.colecao) colecoes.push({ chave: c.chave, nome: c.nome, nivel })
      percorrer(c.chave, nivel + 1)
    }
  }
  percorrer(null, 0)
  const mudarColecao = (colecao: string) => {
    mudarAssociacao(rf, id, { colecao })
    // Se ela deixou de valer para a coleção que está na tela, sai da mesa (continua guardada).
    if (!associacaoNaColecao({ colecao }, mesa.colecao)) {
      rf.setEdges((es) => es.filter((e) => e.id !== id))
      aoFechar()
      avisar(t('aviso.assocMovida', { col: bib.colecoes.find((c) => c.chave === colecao)?.nome ?? '' }))
    }
  }

  return (
    <aside className="painel" aria-label={t('assoc.painel')}>
      <div className="p-topo">
        <h2>{t('assoc.titulo')}</h2>
        <button className="btn" onClick={aoFechar}>
          {t('assoc.fechar')}
        </button>
      </div>
      <MiniFicha f={fa} />
      <div className="p-dir">↓ {rel || t('assoc.aDefinir')}</div>
      <MiniFicha f={fb} />

      <label className="p-rot" htmlFor="p-rel">
        {t('assoc.relacao')}
      </label>
      <input
        id="p-rel"
        ref={campoRel}
        className="rel-input"
        list="lista-rels"
        placeholder={t('assoc.relacaoEx')}
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
        {t('assoc.anotacao')}
      </label>
      <textarea
        id="p-nota"
        placeholder={t('assoc.anotacaoEx')}
        value={assoc.nota}
        onChange={(e) => mudarAssociacao(rf, id, { nota: e.target.value })}
      />

      <label className="p-rot" htmlFor="p-col">
        {t('assoc.colecao')}
      </label>
      <select id="p-col" className="rel-input" value={assoc.colecao} onChange={(e) => mudarColecao(e.target.value)}>
        <option value="*">{t('assoc.geral')}</option>
        {colecoes.map((c) => (
          <option key={c.chave} value={c.chave}>
            {'   '.repeat(c.nivel)}
            {c.nome}
          </option>
        ))}
      </select>

      <div className="p-acoes">
        <button className="btn" onClick={() => inverterAssociacao(rf, assoc)}>
          {t('assoc.inverter')}
        </button>
        <button className="btn" onClick={() => mudarAssociacao(rf, id, {}, ['dx', 'dy', 'w', 'h'])}>
          {t('assoc.recentralizar')}
        </button>
        <button
          className="remover"
          onClick={() => {
            if (!confirmar) return setConfirmar(true)
            removerAssociacao(rf, id)
            aoFechar()
            avisar(t('aviso.assocRemovida'))
          }}
        >
          {confirmar ? t('assoc.confirma') : t('assoc.remover')}
        </button>
      </div>
    </aside>
  )
}

function MiniFicha({ f }: { f: Ficha | undefined }) {
  if (!f) return <div className="p-f">{t('assoc.fichaNaoEncontrada')}</div>
  const cor = mesa.fichas[f.chave]?.cor
  return (
    <div className="p-f" style={{ borderLeftColor: cor ? `var(--c-${cor})` : undefined }}>
      <div className="autor">{f.autorAno}</div>
      {f.obra && <div className="obra">{f.obra}</div>}
      {f.tese && <p>{f.tese}</p>}
    </div>
  )
}
