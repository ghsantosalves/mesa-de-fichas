// Abrir o PDF de um texto no Zotero, numa página: as referências "[p. 66]" das fichas
// viram links. Para isso é preciso a chave do anexo PDF (não a do texto), que o app
// pergunta ao Zotero na hora do clique (só leitura) e guarda para as próximas vezes.
//
// O Zotero abre pela POSIÇÃO no PDF (1ª folha, 2ª…), não pelo número impresso. Para
// capítulos e artigos, o campo "Páginas" do texto no Zotero (ex.: "65-119") diz onde o
// PDF começa: p. 66 é então a 2ª folha. Sem esse campo, vale o intervalo da linha "Ref."
// da ficha (ex.: "cap. II, p. 65-119"), pensando num PDF só do capítulo. Sem nenhum
// dos dois (livros inteiros), usa o próprio número.

import { buscarJson, caminhoUsuario } from './api.ts'

type Anexo = { key: string; data: { itemType: string; contentType?: string; linkMode?: string } }
type Texto = { data: { pages?: string } }

/** PDF de cada texto já consultado (chave do anexo e página impressa da 1ª folha). */
const pdfs = new Map<string, { chave: string | null; primeira: number }>()

async function pdfDoTexto(chavePai: string): Promise<{ chave: string | null; primeira: number }> {
  if (pdfs.has(chavePai)) return pdfs.get(chavePai)!
  const usuario = caminhoUsuario()
  const [anexos, texto] = await Promise.all([
    buscarJson<Anexo[]>(`${usuario}/items/${chavePai}/children?itemType=attachment`),
    buscarJson<Texto>(`${usuario}/items/${chavePai}`),
  ])
  const pdf = anexos.dados.find((a) => a.data.contentType === 'application/pdf')
  const primeira = Number(texto.dados.data.pages?.match(/\d+/)?.[0] ?? 1) || 1
  const r = { chave: pdf?.key ?? null, primeira }
  pdfs.set(chavePai, r)
  return r
}

/**
 * Abre no Zotero o PDF do texto, na página dada. Se o texto não tiver PDF (ou o
 * Zotero não responder), abre o próprio texto no Zotero.
 */
export async function abrirPagina(chavePai: string, pagina: number, refDaFicha = '') {
  let endereco = `zotero://select/library/items/${chavePai}`
  try {
    const pdf = await pdfDoTexto(chavePai)
    // Sem "Páginas" no Zotero: o intervalo da linha Ref. da ficha (o último que aparecer).
    const daRef = [...refDaFicha.matchAll(/p\.\s*(\d+)\s*[-–]\s*\d+/g)].pop()?.[1]
    const primeira = pdf.primeira > 1 ? pdf.primeira : Number(daRef ?? 1) || 1
    // Página impressa → posição no PDF (se o PDF começa na página "primeira").
    const folha = pagina >= primeira ? pagina - primeira + 1 : pagina
    if (pdf.chave) endereco = `zotero://open-pdf/library/items/${pdf.chave}?page=${folha}`
  } catch {
    /* sem resposta do Zotero: abre o texto mesmo */
  }
  location.href = endereco
}

/** Partes de um texto: trechos comuns e números de página dentro de "[p. …]". */
export type ParteTexto = { texto: string; pagina?: number }

/**
 * Separa as referências de página: em "[p. 66-77; 85, 89]" cada número (ou começo de
 * intervalo) vira uma parte com `pagina`. "[p. ?]" e referências a outros textos
 * ("[R p. 12]") ficam como texto comum.
 */
export function separarPaginas(texto: string): ParteTexto[] {
  const partes: ParteTexto[] = []
  let pos = 0
  for (const m of texto.matchAll(/\[p\.\s*([^\]]*)\]/g)) {
    const inicio = m.index! + m[0].indexOf(m[1])
    if (inicio > pos) partes.push({ texto: texto.slice(pos, inicio) })
    let p = 0
    for (const n of m[1].matchAll(/(\d+)(\s*[-–]\s*\d+)?/g)) {
      if (n.index! > p) partes.push({ texto: m[1].slice(p, n.index) })
      partes.push({ texto: n[0], pagina: Number(n[1]) })
      p = n.index! + n[0].length
    }
    if (p < m[1].length) partes.push({ texto: m[1].slice(p) })
    pos = inicio + m[1].length
  }
  if (pos < texto.length) partes.push({ texto: texto.slice(pos) })
  return partes
}
