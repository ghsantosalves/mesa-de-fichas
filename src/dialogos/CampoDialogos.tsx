// Diálogos da ficha: cada item é um autor e a relação dele com o texto, como em
// "Koselleck (apoia-se em)". Dois campos lado a lado (Autor e Relação) e o botão
// Adicionar (ou Enter). A relação é livre: as sugestões só ajudam a escolher.

import { useRef, useState } from 'react'
import { idioma, t } from '../i18n.ts'

const SUGESTOES =
  idioma === 'en'
    ? ['builds on', 'critiques', 'extends', 'dialogues with', 'contrasts with', 'mentions', 'object']
    : ['apoia-se em', 'critica', 'amplia', 'dialoga com', 'contrasta com', 'menciona', 'objeto']

type Props = {
  /** id do campo Autor (para o rótulo do formulário). */
  id: string
  itens: string[]
  aoMudar: (itens: string[]) => void
  /** O item ainda não adicionado (para aparecer na prévia da nota). */
  aoMudarRascunho: (texto: string) => void
}

export function CampoDialogos({ id, itens, aoMudar, aoMudarRascunho }: Props) {
  const [autor, setAutor] = useState('')
  const [rel, setRel] = useState('')
  const campoAutor = useRef<HTMLInputElement>(null)
  const formatar = (a: string, r: string) => (a.trim() ? (r.trim() ? `${a.trim()} (${r.trim()})` : a.trim()) : '')
  const mudar = (a: string, r: string) => {
    setAutor(a)
    setRel(r)
    aoMudarRascunho(formatar(a, r))
  }
  const adicionar = () => {
    const item = formatar(autor, rel)
    if (!item) return
    aoMudar([...itens, item])
    mudar('', '')
    campoAutor.current?.focus()
  }
  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      adicionar()
    }
  }

  return (
    <div className="campo-dialogos">
      {itens.length > 0 && (
        <div className="cd-itens">
          {itens.map((item, i) => (
            <span key={`${i}-${item}`} className="cl-item">
              {item}
              <button
                type="button"
                className="cl-tirar"
                aria-label={t('lista.tirar', { item })}
                onClick={() => aoMudar(itens.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="cd-linha">
        <input
          id={id}
          ref={campoAutor}
          className="rel-input"
          placeholder={t('dial.autor')}
          aria-label={t('dial.autorRotulo')}
          value={autor}
          onChange={(e) => mudar(e.target.value, rel)}
          onKeyDown={aoTeclar}
        />
        <input
          className="rel-input"
          list="cd-relacoes"
          placeholder={t('dial.relacao')}
          aria-label={t('dial.relacaoRotulo')}
          value={rel}
          onChange={(e) => mudar(autor, e.target.value)}
          onKeyDown={aoTeclar}
        />
        <datalist id="cd-relacoes">
          {SUGESTOES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button type="button" className="btn" disabled={!autor.trim()} onClick={adicionar}>
          {t('lista.adicionar')}
        </button>
      </div>
      <div className="cd-sugestoes">
        <span>{t('dial.sugestoes')}</span>
        {SUGESTOES.map((s) => (
          <button key={s} type="button" className="btn mini" aria-pressed={rel === s} onClick={() => mudar(autor, s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
