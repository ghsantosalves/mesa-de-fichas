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

/** Ponto onde a reta do centro de `r` até `alvo` sai do retângulo, com uma folga. */
function borda(r: Retangulo, alvo: Ponto, folga: number): Ponto {
  const dx = alvo.x - r.cx
  const dy = alvo.y - r.cy
  if (!dx && !dy) return { x: r.cx, y: r.cy }
  const s = Math.min((r.w / 2 + folga) / Math.abs(dx || 1e-9), (r.h / 2 + folga) / Math.abs(dy || 1e-9))
  return { x: r.cx + dx * s, y: r.cy + dy * s }
}

/**
 * Caminho SVG de A até B passando pelo ponto `p` (o centro da caixa da associação,
 * quando ela foi tirada do meio da seta). Cada seta segue o seu próprio caminho,
 * pela sua caixa, e não fica por cima das outras.
 */
export function caminhoPorPonto(a: Retangulo, b: Retangulo, p: Ponto): string {
  const s = borda(a, p, FOLGA_INICIO)
  const e = borda(b, p, FOLGA_FIM)
  // Controle da curva quadrática escolhido para ela passar exatamente por p no meio.
  const q = { x: 2 * p.x - (s.x + e.x) / 2, y: 2 * p.y - (s.y + e.y) / 2 }
  return `M${s.x},${s.y} Q${q.x},${q.y} ${e.x},${e.y}`
}

/** Caminho SVG da curva. */
export const caminho = ({ s, c1, c2, e }: ReturnType<typeof curva>) =>
  `M${s.x},${s.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${e.x},${e.y}`

/** Ponto do meio da curva (onde fica a caixa da associação). */
export const meioDaCurva = ({ s, c1, c2, e }: ReturnType<typeof curva>): Ponto => ({
  x: (s.x + 3 * c1.x + 3 * c2.x + e.x) / 8,
  y: (s.y + 3 * c1.y + 3 * c2.y + e.y) / 8,
})
