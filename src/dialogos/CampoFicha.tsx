// Um campo do formulário "Nova ficha": rótulo, botão "?" com ajuda (para que serve,
// como preencher, exemplo), o campo em si e uma dica curta embaixo.

import { useState, type ReactNode } from 'react'
import { t, type Chave } from '../i18n.ts'

type Props = {
  rotulo: string
  /** id do campo, para o rótulo apontar para ele. */
  htmlFor?: string
  /** Base das chaves de ajuda: ajuda.<base>.para / .como / .ex */
  ajuda?: string
  obrigatorio?: boolean
  dica?: string
  children: ReactNode
}

export function CampoFicha({ rotulo, htmlFor, ajuda, obrigatorio, dica, children }: Props) {
  const [aberta, setAberta] = useState(false)
  const texto = (parte: string) => t(`ajuda.${ajuda}.${parte}` as Chave)
  return (
    <div className="nf-campo">
      <div className="nf-rotulo">
        <label htmlFor={htmlFor}>
          {rotulo}
          {obrigatorio && <span className="nf-obrigatorio"> *</span>}
        </label>
        {ajuda && (
          <button
            type="button"
            className="nf-ajuda-btn"
            aria-expanded={aberta}
            aria-label={t('ajuda.botao', { campo: rotulo })}
            title={t('ajuda.botao', { campo: rotulo })}
            onClick={() => setAberta(!aberta)}
          >
            ?
          </button>
        )}
      </div>
      {ajuda && aberta && (
        <div className="nf-ajuda">
          <p>
            <strong>{t('ajuda.para')}</strong> {texto('para')}
          </p>
          <p>
            <strong>{t('ajuda.como')}</strong> {texto('como')}
          </p>
          <p>
            <strong>{t('ajuda.ex')}</strong> <em>{texto('ex')}</em>
          </p>
        </div>
      )}
      {children}
      {dica && <p className="d-dica">{dica}</p>}
    </div>
  )
}
