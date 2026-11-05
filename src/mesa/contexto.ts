// Informações da mesa que cartões e associações precisam saber.

import { createContext } from 'react'

export type ContextoMesa = {
  /** Modo "Associar fichas" ligado. */
  ligando: boolean
  /** Primeira ficha escolhida no modo de associar. */
  escolhida: string | null
  /** Associação aberta no painel. */
  ativa: string | null
  /** As duas fichas da associação aberta. */
  pontas: string[]
  /** Mostrar anotações nas caixas das associações. */
  notas: boolean
  /** Texto da busca, já normalizado (sem acentos, minúsculo). Vazio = sem busca. */
  busca: string
  abrirAssoc: (id: string) => void
}

/** Minúsculas e sem acentos, para comparar textos na busca. */
export const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const Contexto = createContext<ContextoMesa>({
  ligando: false,
  escolhida: null,
  ativa: null,
  pontas: [],
  notas: true,
  busca: '',
  abrirAssoc: () => {},
})
