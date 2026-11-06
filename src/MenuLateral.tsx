// Menu lateral, à esquerda e retrátil: as ações menos usadas, em grupos, com ícones.
// Fechado, fica só uma faixa estreita com os ícones (o nome aparece ao passar o mouse);
// aberto, mostra também os nomes. O botão ☰ da barra abre e fecha.

import type { LucideIcon } from 'lucide-react'

export type ItemMenu = { icone: LucideIcon; nome: string; acao: () => void }
export type GrupoMenu = { titulo: string; itens: ItemMenu[] }

export function MenuLateral({ aberto, grupos, rotulo }: { aberto: boolean; grupos: GrupoMenu[]; rotulo: string }) {
  return (
    <nav className={`menu-lateral${aberto ? ' aberto' : ''}`} aria-label={rotulo}>
      {grupos.map((g) => (
        <div key={g.titulo} className="ml-grupo">
          {aberto && <p className="ml-titulo">{g.titulo}</p>}
          {g.itens.map(({ icone: Icone, nome, acao }) => (
            <button key={nome} className="ml-item" title={aberto ? undefined : nome} aria-label={nome} onClick={acao}>
              <Icone size={18} strokeWidth={1.9} aria-hidden="true" />
              {aberto && <span>{nome}</span>}
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
}
