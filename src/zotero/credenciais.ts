// De onde vêm o número de usuário e a chave do Zotero.
//
// - No computador (npm run dev com .env.local preenchido): a chave fica no servidor
//   local, que a acrescenta aos pedidos (/zotero → api.zotero.org). O navegador nunca a vê.
// - No site (GitHub Pages): a pessoa digita número e chave uma vez; eles ficam guardados
//   só no navegador dela e vão só para api.zotero.org.

const CHAVE = 'mesa-de-fichas:zotero'

/** true quando o app roda no computador com o .env.local configurado. */
export const MODO_LOCAL = __ZOTERO_CHAVE_CONFIGURADA__ && __ZOTERO_USER_ID__ !== ''

export type Credenciais = { userId: string; apiKey: string }

export function lerCredenciais(): Credenciais | null {
  if (MODO_LOCAL) return { userId: __ZOTERO_USER_ID__, apiKey: '' }
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Credenciais | null
    return d && d.userId && d.apiKey ? d : null
  } catch {
    return null
  }
}

export function salvarCredenciais(c: Credenciais) {
  localStorage.setItem(CHAVE, JSON.stringify({ userId: c.userId.trim(), apiKey: c.apiKey.trim() }))
}

export function esquecerCredenciais() {
  localStorage.removeItem(CHAVE)
}

/** Endereço base e cabeçalhos dos pedidos ao Zotero. */
export function destino(c: Credenciais): { base: string; cabecalhos: Record<string, string> } {
  if (MODO_LOCAL) return { base: '/zotero', cabecalhos: {} }
  return {
    base: 'https://api.zotero.org',
    cabecalhos: { 'Zotero-API-Key': c.apiKey, 'Zotero-API-Version': '3' },
  }
}

/** Confere número e chave perguntando ao Zotero de quem é a chave. Devolve o motivo do erro, ou null. */
export async function testarCredenciais(c: Credenciais): Promise<string | null> {
  if (!/^\d+$/.test(c.userId.trim())) return 'O número de usuário deve ter só algarismos.'
  if (!c.apiKey.trim()) return 'Falta a chave.'
  let r: Response
  try {
    r = await fetch('https://api.zotero.org/keys/current', {
      headers: { 'Zotero-API-Key': c.apiKey.trim(), 'Zotero-API-Version': '3' },
    })
  } catch {
    return 'Não consegui falar com o Zotero. Confira a internet.'
  }
  if (r.status === 403 || r.status === 404) return 'O Zotero não reconheceu a chave. Confira se copiou a chave inteira.'
  if (!r.ok) return `O Zotero respondeu com erro ${r.status}.`
  const info = (await r.json()) as { userID: number; access?: { user?: { library?: boolean; notes?: boolean } } }
  if (String(info.userID) !== c.userId.trim()) {
    return `Esta chave é do usuário ${info.userID}, não do ${c.userId.trim()}. Confira o número.`
  }
  if (!info.access?.user?.library || !info.access?.user?.notes) {
    return 'A chave precisa de permissão para ler a biblioteca e as notas (Allow library access e Allow notes access).'
  }
  return null
}
