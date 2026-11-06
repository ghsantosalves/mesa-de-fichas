// Lateral: à esquerda, com tudo o que antes ficava na barra do topo e no Menu.
// - No computador: aberta (com nomes) ou recolhida numa faixa de ícones (o nome
//   aparece ao passar o mouse). O botão do topo da lateral alterna.
// - Em tela estreita (celular): vira uma gaveta, que abre por cima da mesa pelo botão ☰
//   e fecha ao escolher uma ação, ao tocar fora ou com Esc.

import type { ReactNode } from 'react'
import { Menu, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from 'lucide-react'
import { NOME_APP, t } from './i18n.ts'
import { ContextoDaLateral, useLateral } from './lateralContexto.ts'

type Props = {
  /** Aberta no computador (com nomes) ou recolhida (faixa de ícones). */
  aberta: boolean
  aoAlternar: () => void
  /** Celular: gaveta por cima da mesa. */
  gaveta: boolean
  gavetaAberta: boolean
  aoMudarGaveta: (aberta: boolean) => void
  children: ReactNode
}

export function Lateral({ aberta, aoAlternar, gaveta, gavetaAberta, aoMudarGaveta, children }: Props) {
  const comNomes = gaveta || aberta
  const depoisDeAgir = () => {
    if (gaveta) aoMudarGaveta(false)
  }
  if (gaveta && !gavetaAberta) {
    return (
      <button className="botao-gaveta btn icone" aria-label={t('menu.abrir')} onClick={() => aoMudarGaveta(true)}>
        <Menu size={20} aria-hidden="true" />
      </button>
    )
  }
  return (
    <ContextoDaLateral.Provider value={{ aberta: comNomes, depoisDeAgir }}>
      {gaveta && <div className="lateral-fundo" onClick={() => aoMudarGaveta(false)} />}
      <aside className={`lateral${comNomes ? ' aberta' : ''}${gaveta ? ' gaveta' : ''}`} aria-label={t('menu.rotulo')}>
        <div className="lt-topo">
          {comNomes && (
            <div className="marca">
              <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="24" height="24" />
              {NOME_APP}
            </div>
          )}
          <button
            className="btn icone"
            aria-label={gaveta ? t('jan.fechar') : aberta ? t('menu.fechar') : t('menu.abrir')}
            title={gaveta ? t('jan.fechar') : aberta ? t('menu.fechar') : t('menu.abrir')}
            onClick={gaveta ? () => aoMudarGaveta(false) : aoAlternar}
          >
            {gaveta ? (
              <X size={18} aria-hidden="true" />
            ) : aberta ? (
              <PanelLeftClose size={18} aria-hidden="true" />
            ) : (
              <PanelLeftOpen size={18} aria-hidden="true" />
            )}
          </button>
        </div>
        <div className="lt-conteudo">{children}</div>
      </aside>
    </ContextoDaLateral.Provider>
  )
}

/** Seção da lateral, com título (o título só aparece com a lateral aberta). */
export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { aberta } = useLateral()
  return (
    <div className="ml-grupo">
      {aberta && <p className="ml-titulo">{titulo}</p>}
      {children}
    </div>
  )
}

type ItemProps = {
  icone: LucideIcon
  nome: string
  acao: () => void
  /** Botão de liga/desliga: mostra se está ligado. */
  ligado?: boolean
  dica?: string
  desligado?: boolean
  /** Não fecha a gaveta do celular depois de agir. */
  manterAberta?: boolean
}

/** Item da lateral: ícone e (com a lateral aberta) o nome. */
export function Item({ icone: Icone, nome, acao, ligado, dica, desligado, manterAberta }: ItemProps) {
  const { aberta, depoisDeAgir } = useLateral()
  return (
    <button
      className="ml-item"
      title={dica ?? (aberta ? undefined : nome)}
      aria-label={nome}
      aria-pressed={ligado}
      disabled={desligado}
      onClick={() => {
        acao()
        if (!manterAberta) depoisDeAgir()
      }}
    >
      <Icone size={18} strokeWidth={1.9} aria-hidden="true" />
      {aberta && <span>{nome}</span>}
    </button>
  )
}
