// Comunicação com a Zotero Web API v3, sempre pelo servidor local (/zotero),
// que acrescenta a chave. O app só lê: nenhuma função aqui escreve no Zotero.

const BASE = '/zotero'
const TENTATIVAS = 4

export class ErroZotero extends Error {}

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

/** Momento (em ms) até o qual o Zotero pediu para não fazermos pedidos (cabeçalho Backoff). */
let liberadoEm = 0

async function pedir(caminho: string): Promise<Response> {
  for (let tentativa = 0; ; tentativa++) {
    const falta = liberadoEm - Date.now()
    if (falta > 0) await esperar(falta)

    let r: Response
    try {
      r = await fetch(BASE + caminho)
    } catch {
      throw new ErroZotero(
        'Não consegui falar com o Zotero. Confira a internet e se o app está rodando (npm run dev).',
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
      throw new ErroZotero('O Zotero recusou o acesso. Confira ZOTERO_API_KEY no .env.local.')
    }
    if (!r.ok) throw new ErroZotero(`O Zotero respondeu com erro ${r.status}.`)
    return r
  }
}

/** Busca todas as páginas de uma lista (100 por vez) e a versão da biblioteca. */
export async function buscarTodos<T>(caminho: string): Promise<{ itens: T[]; versao: number }> {
  const itens: T[] = []
  let versao = 0
  const sep = caminho.includes('?') ? '&' : '?'
  for (let inicio = 0; ; ) {
    const r = await pedir(`${caminho}${sep}limit=100&start=${inicio}`)
    versao = Math.max(versao, Number(r.headers.get('Last-Modified-Version')) || 0)
    const lote = (await r.json()) as T[]
    itens.push(...lote)
    inicio += lote.length
    const total = Number(r.headers.get('Total-Results'))
    if (lote.length === 0 || !(inicio < total)) break
  }
  return { itens, versao }
}
