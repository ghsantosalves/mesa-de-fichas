// Comunicação com a Zotero Web API v3. O app só lê: nenhuma função aqui escreve no Zotero.
// O endereço e a chave vêm de credenciais.ts (servidor local ou direto do navegador).

import { destino, lerCredenciais, MODO_LOCAL } from './credenciais.ts'

const TENTATIVAS = 4

export class ErroZotero extends Error {}
/** O Zotero recusou a chave (apagada, sem permissão…): é preciso conectar de novo. */
export class ErroAcesso extends ErroZotero {}

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

/** Momento (em ms) até o qual o Zotero pediu para não fazermos pedidos (cabeçalho Backoff). */
let liberadoEm = 0

/** Caminho da biblioteca pessoal, ex.: /users/1234567 */
export function caminhoUsuario(): string {
  const c = lerCredenciais()
  if (!c) throw new ErroAcesso('Falta conectar ao Zotero.')
  return `/users/${encodeURIComponent(c.userId)}`
}

async function pedir(caminho: string): Promise<Response> {
  const c = lerCredenciais()
  if (!c) throw new ErroAcesso('Falta conectar ao Zotero.')
  const { base, cabecalhos } = destino(c)
  for (let tentativa = 0; ; tentativa++) {
    const falta = liberadoEm - Date.now()
    if (falta > 0) await esperar(falta)

    let r: Response
    try {
      r = await fetch(base + caminho, { headers: cabecalhos })
    } catch {
      throw new ErroZotero(
        MODO_LOCAL
          ? 'Não consegui falar com o Zotero. Confira a internet e se o app está rodando (npm run dev).'
          : 'Não consegui falar com o Zotero. Confira a internet.',
      )
    }

    const backoff = Number(r.headers.get('Backoff'))
    if (backoff > 0) liberadoEm = Date.now() + backoff * 1000

    if ((r.status === 429 || r.status === 503) && tentativa < TENTATIVAS) {
      const retryAfter = Number(r.headers.get('Retry-After'))
      await esperar((retryAfter > 0 ? retryAfter : 2 ** (tentativa + 1)) * 1000)
      continue
    }
    if (r.status === 403) {
      throw new ErroAcesso(
        MODO_LOCAL
          ? 'O Zotero recusou o acesso. Confira ZOTERO_API_KEY no .env.local.'
          : 'O Zotero recusou a chave (ela pode ter sido apagada ou mudada). Conecte de novo.',
      )
    }
    if (!r.ok) throw new ErroZotero(`O Zotero respondeu com erro ${r.status}.`)
    return r
  }
}

const versaoDe = (r: Response) => Number(r.headers.get('Last-Modified-Version')) || 0

/** Busca todas as páginas de uma lista (100 por vez) e a versão da biblioteca. */
export async function buscarTodos<T>(caminho: string): Promise<{ itens: T[]; versao: number }> {
  const itens: T[] = []
  let versao = 0
  const sep = caminho.includes('?') ? '&' : '?'
  for (let inicio = 0; ; ) {
    const r = await pedir(`${caminho}${sep}limit=100&start=${inicio}`)
    versao = Math.max(versao, versaoDe(r))
    const lote = (await r.json()) as T[]
    itens.push(...lote)
    inicio += lote.length
    const total = Number(r.headers.get('Total-Results'))
    if (lote.length === 0 || !(inicio < total)) break
  }
  return { itens, versao }
}

/** Um pedido só, com resposta em JSON (ex.: format=versions, que vem inteiro). */
export async function buscarJson<T>(caminho: string): Promise<{ dados: T; versao: number }> {
  const r = await pedir(caminho)
  return { dados: (await r.json()) as T, versao: versaoDe(r) }
}

/** Um pedido só, com resposta em texto (ex.: format=keys, uma chave por linha). */
export async function buscarTexto(caminho: string): Promise<{ texto: string; versao: number }> {
  const r = await pedir(caminho)
  return { texto: await r.text(), versao: versaoDe(r) }
}
