// O que os itens da lateral precisam saber (ela está aberta? fechar a gaveta depois de
// agir) e a detecção de tela estreita (celular), separados dos componentes.

import { createContext, useContext, useEffect, useState } from 'react'

/** A lateral está aberta (com nomes)? E fechar a gaveta (no celular) depois de uma ação. */
export type ContextoLateral = { aberta: boolean; depoisDeAgir: () => void }
export const ContextoDaLateral = createContext<ContextoLateral>({ aberta: true, depoisDeAgir: () => {} })
export const useLateral = () => useContext(ContextoDaLateral)

/** Tela estreita (celular ou janela pequena). */
export function useTelaEstreita(largura = 760): boolean {
  const consulta = `(max-width: ${largura}px)`
  const [estreita, setEstreita] = useState(() => matchMedia(consulta).matches)
  useEffect(() => {
    const m = matchMedia(consulta)
    const mudou = () => setEstreita(m.matches)
    m.addEventListener('change', mudou)
    return () => m.removeEventListener('change', mudou)
  }, [consulta])
  return estreita
}
