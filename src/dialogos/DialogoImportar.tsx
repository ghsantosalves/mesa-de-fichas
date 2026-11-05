// Importar associações sugeridas pelo Claude (skill "relacoes-entre-textos"):
// cole a resposta ou escolha o arquivo, marque as que quer e coloque na mesa.

import { useMemo, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { mesa } from '../estado/mesa.ts'
import { importarAssociacoes, type ArestaAssoc } from '../mesa/assoc.ts'
import type { NoMesa } from '../mesa/operacoes.ts'
import type { Biblioteca } from '../zotero/biblioteca.ts'
import { Dialogo } from './Dialogo.tsx'

type Sugestao = {
  a: string
  b: string
  rel: string
  nota: string
  confianca: string
  /** Por que não dá para importar (ficha não encontrada), ou null. */
  problema: string | null
  /** Já existe uma associação entre essas duas fichas. */
  repetida: boolean
}

/** Acha o bloco JSON com "associacoes" no texto colado (com ou sem ```json). */
function lerSugestoes(texto: string): { a: string; b: string; rel: string; nota: string; confianca: string }[] {
  const blocos = [...texto.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1])
  const inicio = texto.indexOf('{')
  const fim = texto.lastIndexOf('}')
  if (inicio >= 0 && fim > inicio) blocos.push(texto.slice(inicio, fim + 1))
  for (const b of blocos) {
    try {
      const d = JSON.parse(b) as { associacoes?: unknown }
      if (!Array.isArray(d.associacoes)) continue
      const limpar = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
      // Aceita "ABCD1234" ou "[ABCD1234]".
      const id = (v: unknown) => limpar(v).replace(/^\[|\]$/g, '')
      return (d.associacoes as Record<string, unknown>[])
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({ a: id(x.a), b: id(x.b), rel: limpar(x.rel), nota: limpar(x.nota), confianca: limpar(x.confianca) }))
        .filter((x) => x.a && x.b && x.a !== x.b)
    } catch {
      /* tenta o próximo bloco */
    }
  }
  throw new Error('não achei')
}

export function DialogoImportar({ bib, aoFechar, avisar }: { bib: Biblioteca; aoFechar: () => void; avisar: (t: string) => void }) {
  const rf = useReactFlow<NoMesa, ArestaAssoc>()
  const [texto, setTexto] = useState('')
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set())
  const fichas = useMemo(() => new Map(bib.fichas.map((f) => [f.chave, f])), [bib])

  const { sugestoes, erro } = useMemo((): { sugestoes: Sugestao[]; erro: string | null } => {
    if (!texto.trim()) return { sugestoes: [], erro: null }
    try {
      const lista = lerSugestoes(texto).map((s) => {
        const faltam = [s.a, s.b].filter((k) => !fichas.has(k))
        const repetida = mesa.associacoes.some((x) => (x.a === s.a && x.b === s.b) || (x.a === s.b && x.b === s.a))
        return {
          ...s,
          problema: faltam.length ? `Ficha não encontrada: ${faltam.join(', ')}` : null,
          repetida,
        }
      })
      if (!lista.length) return { sugestoes: [], erro: 'O texto não traz nenhuma associação.' }
      return { sugestoes: lista, erro: null }
    } catch {
      return {
        sugestoes: [],
        erro: 'Não achei as associações no texto. Cole a resposta inteira do Claude (com o bloco que começa com {"formato": "mesa-de-fichas-associacoes" …}).',
      }
    }
  }, [texto, fichas])

  const ler = (t: string) => {
    setTexto(t)
    // Começa marcando as que podem entrar e ainda não existem.
    try {
      const lista = lerSugestoes(t)
      const ok = new Set<number>()
      lista.forEach((s, i) => {
        const existe = mesa.associacoes.some((x) => (x.a === s.a && x.b === s.b) || (x.a === s.b && x.b === s.a))
        if (fichas.has(s.a) && fichas.has(s.b) && !existe) ok.add(i)
      })
      setMarcadas(ok)
    } catch {
      setMarcadas(new Set())
    }
  }

  const alternar = (i: number) => {
    const n = new Set(marcadas)
    if (n.has(i)) n.delete(i)
    else n.add(i)
    setMarcadas(n)
  }
  const escolhidas = sugestoes.filter((s, i) => marcadas.has(i) && !s.problema)

  const importar = () => {
    importarAssociacoes(
      rf,
      escolhidas.map((s) => ({ a: s.a, b: s.b, rel: s.rel, nota: s.nota })),
    )
    avisar(escolhidas.length === 1 ? '1 associação colocada na mesa' : `${escolhidas.length} associações colocadas na mesa`)
    aoFechar()
  }

  return (
    <Dialogo titulo="Importar associações" aoFechar={aoFechar}>
      <p className="d-texto">
        Cole aqui a resposta do Claude (skill <em>relacoes-entre-textos</em>) ou escolha o arquivo que ele gerou. Você
        escolhe quais associações colocar na mesa; dá para mudar tudo depois.
      </p>
      <input
        type="file"
        accept=".json,.md,.txt,application/json,text/plain,text/markdown"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) ler(await f.text())
        }}
      />
      <textarea
        className="d-area baixa"
        placeholder="…ou cole a resposta do Claude aqui"
        value={texto}
        onChange={(e) => ler(e.target.value)}
      />
      {erro && <p className="d-msg erro">{erro}</p>}

      {sugestoes.length > 0 && (
        <>
          <div className="d-acoes esquerda">
            <span className="d-texto sem-margem">
              {sugestoes.length} sugestões · {escolhidas.length} marcadas
            </span>
            <button
              className="btn"
              onClick={() => setMarcadas(new Set(sugestoes.map((s, i) => (s.problema ? -1 : i)).filter((i) => i >= 0)))}
            >
              Marcar todas
            </button>
            <button className="btn" onClick={() => setMarcadas(new Set())}>
              Desmarcar todas
            </button>
          </div>
          <ul className="sugestoes">
            {sugestoes.map((s, i) => (
              <li key={i} className={s.problema ? 'invalida' : ''}>
                <label>
                  <input
                    type="checkbox"
                    disabled={!!s.problema}
                    checked={marcadas.has(i) && !s.problema}
                    onChange={() => alternar(i)}
                  />
                  <span>
                    <strong>{fichas.get(s.a)?.autorAno ?? s.a}</strong> → <em>{s.rel || 'relação a definir'}</em> →{' '}
                    <strong>{fichas.get(s.b)?.autorAno ?? s.b}</strong>
                    {s.confianca && <span className="confianca"> · confiança {s.confianca}</span>}
                    {s.nota && <span className="sug-nota">{s.nota}</span>}
                    {s.problema && <span className="sug-aviso">{s.problema}</span>}
                    {s.repetida && !s.problema && (
                      <span className="sug-aviso">Já existe uma associação entre essas fichas.</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="d-acoes">
        <button className="btn" onClick={aoFechar}>
          Cancelar
        </button>
        <button className="btn primario" disabled={!escolhidas.length} onClick={importar}>
          {escolhidas.length ? `Colocar ${escolhidas.length} na mesa` : 'Colocar na mesa'}
        </button>
      </div>
    </Dialogo>
  )
}
