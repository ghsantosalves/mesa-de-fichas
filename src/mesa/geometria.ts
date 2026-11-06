// Desenho das setas das associações: uma curva suave que sai da borda da ficha A
// e chega na borda da ficha B, pelo lado que fica de frente para a outra ficha.
// O mesmo cálculo é usado pela mesa (para desenhar) e pelo Mapa (para saber onde
// fica o meio da seta e pôr a caixa da associação).

/** Retângulo de uma ficha: centro e tamanho. */
export type Retangulo = { cx: number; cy: number; w: number; h: number }
export type Ponto = { x: number; y: number }

/** Folga entre a ponta da seta e a ficha de destino. */
const FOLGA_FIM = 6
const FOLGA_INICIO = 3

/** Pontos da curva (início, dois controles, fim) de A até B. */
export function curva(a: Retangulo, b: Retangulo): { s: Ponto; c1: Ponto; c2: Ponto; e: Ponto } {
  const dx = b.cx - a.cx
  const dy = b.cy - a.cy
  // Sai pelos lados quando as fichas estão mais lado a lado; por cima/baixo quando
  // estão mais uma sobre a outra (comparando com o tamanho delas).
  const horizontal = Math.abs(dx) / ((a.w + b.w) / 2) >= Math.abs(dy) / ((a.h + b.h) / 2)
  if (horizontal) {
    const lado = dx >= 0 ? 1 : -1
    const s = { x: a.cx + lado * (a.w / 2 + FOLGA_INICIO), y: a.cy }
    const e = { x: b.cx - lado * (b.w / 2 + FOLGA_FIM), y: b.cy }
    const k = Math.max(40, Math.abs(e.x - s.x) / 2)
    return { s, c1: { x: s.x + lado * k, y: s.y }, c2: { x: e.x - lado * k, y: e.y }, e }
  }
  const lado = dy >= 0 ? 1 : -1
  const s = { x: a.cx, y: a.cy + lado * (a.h / 2 + FOLGA_INICIO) }
  const e = { x: b.cx, y: b.cy - lado * (b.h / 2 + FOLGA_FIM) }
  const k = Math.max(40, Math.abs(e.y - s.y) / 2)
  return { s, c1: { x: s.x, y: s.y + lado * k }, c2: { x: e.x, y: e.y - lado * k }, e }
}

/** Caminho SVG da curva. */
export const caminho = ({ s, c1, c2, e }: ReturnType<typeof curva>) =>
  `M${s.x},${s.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${e.x},${e.y}`

/** Ponto do meio da curva (onde fica a caixa da associação). */
export const meioDaCurva = ({ s, c1, c2, e }: ReturnType<typeof curva>): Ponto => ({
  x: (s.x + 3 * c1.x + 3 * c2.x + e.x) / 8,
  y: (s.y + 3 * c1.y + 3 * c2.y + e.y) / 8,
})
