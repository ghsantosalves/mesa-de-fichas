// Exportar: imagem PNG da mesa visível e resumo das associações em Markdown.

import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { baixar, imagemDaMesa, nomeArquivo, resumoAssociacoes } from '../exportar.ts'
import type { Biblioteca } from '../zotero/biblioteca.ts'
import type { NoMesa } from '../mesa/operacoes.ts'
import { Dialogo } from './Dialogo.tsx'

export function DialogoExportar({ bib, colecao, aoFechar }: { bib: Biblioteca; colecao: string; aoFechar: () => void }) {
  const rf = useReactFlow<NoMesa>()
  const [completa, setCompleta] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null)
  const texto = resumoAssociacoes(bib, colecao, completa)

  const gerarImagem = async () => {
    setMsg({ texto: 'Gerando imagem…' })
    try {
      baixar(nomeArquivo(bib, colecao, 'png'), await imagemDaMesa(rf))
      setMsg({ texto: 'Imagem baixada (veja a pasta Downloads).' })
    } catch (e) {
      setMsg({ texto: `Não foi possível gerar a imagem. ${e instanceof Error ? e.message : ''}`, erro: true })
    }
  }
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setMsg({ texto: 'Texto copiado.' })
    } catch {
      setMsg({ texto: 'Não consegui copiar; selecione o texto e use Ctrl+C.', erro: true })
    }
  }

  return (
    <Dialogo titulo="Exportar" aoFechar={aoFechar}>
      <p className="d-rot">Imagem da mesa</p>
      <p className="d-texto">Gera um PNG com o que está visível na coleção atual: fichas, áreas e associações.</p>
      <button className="btn primario" onClick={gerarImagem}>
        Baixar imagem
      </button>

      <p className="d-rot">Resumo das associações</p>
      <p className="d-texto">
        Para cada associação: a referência e a tese dos dois textos, a área, a relação e a sua anotação. Serve para
        revisar, guardar ou colar onde quiser.
      </p>
      <label className="d-check">
        <input type="checkbox" checked={completa} onChange={(e) => setCompleta(e.target.checked)} /> Incluir as fichas
        completas
      </label>
      <textarea className="d-area" readOnly value={texto} />
      <div className="d-acoes">
        {msg && <span className={`d-msg${msg.erro ? ' erro' : ''}`}>{msg.texto}</span>}
        <button className="btn" onClick={copiar}>
          Copiar texto
        </button>
        <button
          className="btn"
          onClick={() => baixar(nomeArquivo(bib, colecao, 'md', 'resumo-associacoes'), texto, 'text/markdown;charset=utf-8')}
        >
          Baixar .md
        </button>
        <button className="btn primario" onClick={aoFechar}>
          Fechar
        </button>
      </div>
    </Dialogo>
  )
}
