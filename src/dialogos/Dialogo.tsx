// Janela (modal) simples, usando o <dialog> do próprio navegador.

import { useEffect, useRef, type ReactNode } from 'react'

export function Dialogo({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog ref={ref} className="dialogo" onClose={aoFechar} onCancel={aoFechar}>
      <h2>{titulo}</h2>
      {children}
    </dialog>
  )
}
