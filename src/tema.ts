// Aplica o tema (claro, escuro ou do sistema) e as cores editadas pelo usuário.

import { VARS_TEMA, type ModoTema, type Tema } from './estado/mesa.ts'

const consultaEscuro = matchMedia('(prefers-color-scheme: dark)')

export function modoEfetivo(modo: ModoTema): 'claro' | 'escuro' {
  if (modo !== 'sistema') return modo
  return consultaEscuro.matches ? 'escuro' : 'claro'
}

export function aplicarTema(t: Tema) {
  const raiz = document.documentElement
  if (t.modo === 'sistema') raiz.removeAttribute('data-theme')
  else raiz.dataset.theme = t.modo === 'escuro' ? 'dark' : 'light'
  for (const [nome] of VARS_TEMA) raiz.style.removeProperty(nome)
  for (const [nome, cor] of Object.entries(t.cores[modoEfetivo(t.modo)])) raiz.style.setProperty(nome, cor)
}

/** Avisa quando o sistema troca entre claro e escuro. */
export function aoMudarSistema(f: () => void): () => void {
  consultaEscuro.addEventListener('change', f)
  return () => consultaEscuro.removeEventListener('change', f)
}

/** Cor atual de uma variável, em #rrggbb (para o seletor de cor). */
export function corAtual(nome: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim()
  if (/^#[0-9a-f]{6}$/i.test(v)) return v
  if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('')
  const m = v.match(/\d+/g)
  return m && m.length >= 3 ? '#' + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('') : '#000000'
}
