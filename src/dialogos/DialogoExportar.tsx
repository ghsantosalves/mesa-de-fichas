// Exportar: imagem PNG da mesa visível e resumo das associações em Markdown.

import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { baixar, imagemDaMesa, nomeArquivo, pacoteParaClaude, resumoAssociacoes } from '../exportar.ts'
import type { Biblioteca } from '../zotero/biblioteca.ts'
import type { NoMesa } from '../mesa/operacoes.ts'
import { Dialogo } from './Dialogo.tsx'
import { t } from '../i18n.ts'

export function DialogoExportar({ bib, colecao, aoFechar }: { bib: Biblioteca; colecao: string; aoFechar: () => void }) {
  const rf = useReactFlow<NoMesa>()
  const [completa, setCompleta] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null)
  const texto = resumoAssociacoes(bib, colecao, completa)

  const gerarImagem = async () => {
    setMsg({ texto: t('exp.gerando') })
    try {
      baixar(nomeArquivo(bib, colecao, 'png'), await imagemDaMesa(rf))
      setMsg({ texto: t('exp.imagemBaixada') })
    } catch (e) {
      setMsg({ texto: t('exp.erroImagem', { e: e instanceof Error ? e.message : '' }), erro: true })
    }
  }
  const copiar = async (conteudo = texto) => {
    try {
      await navigator.clipboard.writeText(conteudo)
      setMsg({ texto: t('jan.copiado') })
    } catch {
      setMsg({ texto: t('jan.naoCopiou'), erro: true })
    }
  }

  return (
    <Dialogo titulo={t('exp.titulo')} aoFechar={aoFechar}>
      <p className="d-rot">{t('exp.imagem')}</p>
      <p className="d-texto">{t('exp.imagemExplica')}</p>
      <button className="btn primario" onClick={gerarImagem}>
        {t('exp.baixarImagem')}
      </button>

      <p className="d-rot">{t('exp.resumo')}</p>
      <p className="d-texto">{t('exp.resumoExplica')}</p>
      <label className="d-check">
        <input type="checkbox" checked={completa} onChange={(e) => setCompleta(e.target.checked)} /> {t('exp.completas')}
      </label>
      <textarea className="d-area" readOnly value={texto} />
      <div className="d-acoes esquerda">
        <button className="btn" onClick={() => copiar()}>
          {t('exp.copiar')}
        </button>
        <button
          className="btn"
          onClick={() => baixar(nomeArquivo(bib, colecao, 'md', 'resumo-associacoes'), texto, 'text/markdown;charset=utf-8')}
        >
          {t('exp.baixarMd')}
        </button>
      </div>

      <p className="d-rot">{t('exp.claude')}</p>
      <p className="d-texto">{t('exp.claudeExplica')}</p>
      <div className="d-acoes esquerda">
        <button
          className="btn primario"
          onClick={() => {
            baixar(nomeArquivo(bib, colecao, 'md', 'fichas-para-o-claude'), pacoteParaClaude(bib, colecao), 'text/markdown;charset=utf-8')
            setMsg({ texto: t('jan.baixado') })
          }}
        >
          {t('exp.baixarClaude')}
        </button>
        <button className="btn" onClick={() => copiar(pacoteParaClaude(bib, colecao))}>
          {t('exp.copiarCurto')}
        </button>
      </div>

      <div className="d-acoes">
        {msg && <span className={`d-msg${msg.erro ? ' erro' : ''}`}>{msg.texto}</span>}
        <button className="btn primario" onClick={aoFechar}>
          {t('jan.fechar')}
        </button>
      </div>
    </Dialogo>
  )
}
