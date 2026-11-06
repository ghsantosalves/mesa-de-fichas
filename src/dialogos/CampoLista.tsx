// Campo de lista (conceitos, diálogos): cada item vira uma etiqueta. Escreva um item
// e aperte Enter (ou digite ";") para passar ao próximo; o × tira o item. Colar um
// texto com vários itens (separados por ";", " · " ou quebras de linha) separa sozinho.
// O texto ainda não confirmado também conta (é devolvido em `rascunho`).

import { useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { t } from '../i18n.ts'

/** Separa um texto em itens: ";" , " · " ou quebra de linha. */
const separar = (s: string) =>
  s
    .split(/\s*(?:;|·|\n)\s*/)
    .map((x) => x.trim())
    .filter(Boolean)

type Props = {
  id: string
  itens: string[]
  aoMudar: (itens: string[]) => void
  rascunho: string
  aoMudarRascunho: (texto: string) => void
  exemplo: string
}

export function CampoLista({ id, itens, aoMudar, rascunho, aoMudarRascunho, exemplo }: Props) {
  const [foco, setFoco] = useState(false)
  const confirmar = (texto = rascunho) => {
    const novos = separar(texto)
    if (novos.length) aoMudar([...itens, ...novos])
    aoMudarRascunho('')
  }
  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ';') {
      e.preventDefault()
      confirmar()
    } else if (e.key === 'Backspace' && !rascunho && itens.length) {
      // Apagar com o campo vazio traz o último item de volta para editar.
      e.preventDefault()
      aoMudarRascunho(itens[itens.length - 1])
      aoMudar(itens.slice(0, -1))
    }
  }
  const aoColar = (e: ClipboardEvent<HTMLInputElement>) => {
    const texto = e.clipboardData.getData('text')
    if (!/;|·|\n/.test(texto)) return
    e.preventDefault()
    confirmar(rascunho + texto)
  }

  return (
    <div className={`campo-lista${foco ? ' com-foco' : ''}`} onClick={() => document.getElementById(id)?.focus()}>
      {itens.map((item, i) => (
        <span key={`${i}-${item}`} className="cl-item">
          {item}
          <button
            type="button"
            className="cl-tirar"
            aria-label={t('lista.tirar', { item })}
            onClick={(e) => {
              e.stopPropagation()
              aoMudar(itens.filter((_, j) => j !== i))
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        className="cl-entrada"
        value={rascunho}
        placeholder={itens.length ? t('lista.mais') : exemplo}
        onChange={(e) => {
          // Um ";" no texto (digitado de qualquer jeito) fecha o item antes dele.
          const v = e.target.value
          if (!v.includes(';')) return aoMudarRascunho(v)
          const partes = v.split(';')
          const resto = partes.pop() ?? ''
          const novos = partes.map((x) => x.trim()).filter(Boolean)
          if (novos.length) aoMudar([...itens, ...novos])
          aoMudarRascunho(resto.trimStart())
        }}
        onKeyDown={aoTeclar}
        onPaste={aoColar}
        onFocus={() => setFoco(true)}
        onBlur={() => {
          setFoco(false)
          confirmar()
        }}
      />
      <button
        type="button"
        className="btn cl-adicionar"
        disabled={!rascunho.trim()}
        // Não tira o cursor do campo ao clicar (o item é adicionado e já dá para digitar o próximo).
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => confirmar()}
      >
        {t('lista.adicionar')}
      </button>
    </div>
  )
}
