// Cores das associações por tipo de relação. Relações parecidas ("apoia-se em",
// "fundamenta", "builds on") ganham a mesma cor; as que não se encaixam em nenhum
// grupo recebem uma cor fixa calculada a partir do próprio texto.

import { normalizar } from './contexto.ts'

/** Grupos de relações, reconhecidos por pedaços de palavras em português e em inglês. */
const GRUPOS: [RegExp, string][] = [
  [/apoi|fundament|base|build|ground|support/, '#2e8b57'],
  [/critic|critiq|refut|contest|rejeit|reject/, '#c0392b'],
  [/contrast|opo[eõ]|oppos|diverg/, '#d9822b'],
  [/ampli|extend|complement|desenvolv|develop|retom|revisit|aprofund|deepen/, '#2f6fd6'],
  [/dialog|convers/, '#8a4fd6'],
  [/aplic|appl|caso|case|exempl|instance/, '#13867f'],
  [/mencion|mention|cita\b|cites/, '#6b7280'],
]
const EXTRAS = ['#b5179e', '#7a5c00', '#3d5a80', '#9c6644', '#5e548e', '#4a7c2a']

/** Chave usada para agrupar relações iguais (sem acentos, minúsculas, sem espaços sobrando). */
export const chaveRelacao = (rel: string) => normalizar(rel.trim()).replace(/\s+/g, ' ')

/** Cor da relação. Relação vazia ("a definir") usa a cor padrão das associações. */
export function corDaRelacao(rel: string): string {
  const k = chaveRelacao(rel)
  if (!k) return 'var(--linha)'
  for (const [re, cor] of GRUPOS) if (re.test(k)) return cor
  let h = 0
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return EXTRAS[h % EXTRAS.length]
}
