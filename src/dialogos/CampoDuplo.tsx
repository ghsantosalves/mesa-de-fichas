// Campo de lista com dois campos lado a lado e o botão Adicionar (ou Enter):
// - Conceitos: "Conceito" e "Página(s)" → "lugar social [p. 66-77]";
// - Diálogos: "Autor" e "Relação" (livre, com sugestões) → "Koselleck (apoia-se em)".
// O app monta o formato da ficha; a pessoa só preenche os campos.

import { useRef, useState, type KeyboardEvent } from 'react'
import { t } from '../i18n.ts'

type Campo = { placeholder: string; rotulo: string; largura?: 'estreito' }

type Props = {
  /** id do primeiro campo (para o rótulo do formulário). */
  id: string
  itens: string[]
  aoMudar: (itens: string[]) => void
  /** O item ainda não adicionado (para aparecer na prévia da nota). */
  aoMudarRascunho: (texto: string) => void
  primeiro: Campo
  segundo: Campo
  /** Monta o item a partir dos dois campos ('' = nada para adicionar). */
  formatar: (a: string, b: string) => string
  /** Sugestões para o segundo campo (clicáveis; dá para escrever outra). */
  sugestoes?: string[]
}

export function CampoDuplo({ id, itens, aoMudar, aoMudarRascunho, primeiro, segundo, formatar, sugestoes }: Props) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const campoA = useRef<HTMLInputElement>(null)
  const mudar = (na: string, nb: string) => {
    setA(na)
    setB(nb)
    aoMudarRascunho(formatar(na, nb))
  }
  const adicionar = () => {
    const item = formatar(a, b)
    if (!item) return
    aoMudar([...itens, item])
    mudar('', '')
    campoA.current?.focus()
  }
  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      adicionar()
    }
  }
  const lista = sugestoes ? `${id}-sugestoes` : undefined

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
          ref={campoA}
          className="rel-input"
          placeholder={primeiro.placeholder}
          aria-label={primeiro.rotulo}
          value={a}
          onChange={(e) => mudar(e.target.value, b)}
          onKeyDown={aoTeclar}
        />
        <input
          className={`rel-input${segundo.largura === 'estreito' ? ' estreito' : ''}`}
          list={lista}
          placeholder={segundo.placeholder}
          aria-label={segundo.rotulo}
          value={b}
          onChange={(e) => mudar(a, e.target.value)}
          onKeyDown={aoTeclar}
        />
        {sugestoes && (
          <datalist id={lista}>
            {sugestoes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
        <button type="button" className="btn" disabled={!a.trim()} onClick={adicionar}>
          {t('lista.adicionar')}
        </button>
      </div>
      {sugestoes && (
        <div className="cd-sugestoes">
          <span>{t('dial.sugestoes')}</span>
          {sugestoes.map((s) => (
            <button key={s} type="button" className="btn mini" aria-pressed={b === s} onClick={() => mudar(a, s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
