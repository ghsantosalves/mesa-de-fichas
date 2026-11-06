// Informações da mesa que cartões e associações precisam saber.

import { createContext } from 'react'

export type Ferramenta = 'caneta' | 'marcador' | 'grifar' | 'borracha'
export const CORES_CANETA = ['#222831', '#2f6fd6', '#d63c3c', '#2e9a5a', '#8a4fd6']
export const CORES_MARCADOR = ['#ffe14d', '#8ef08e', '#ff9ad5', '#8ecdf7', '#ffb56b']

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
  /** Ferramenta de desenho ativa (null = nenhuma). */
  ferramenta: Ferramenta | null
  /** Ficha em foco (clicada): só ela, as associações dela e as fichas ligadas ficam em destaque. */
  foco: string | null
  /** Fichas ligadas à ficha em foco. */
  vizinhos: string[]
  /** Relações escondidas pela legenda (chaves de chaveRelacao). */
  ocultas: string[]
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
  ferramenta: null,
  foco: null,
  vizinhos: [],
  ocultas: [],
  abrirAssoc: () => {},
})
