// Converte o HTML de uma nota do Zotero em texto puro, preservando as quebras de linha.

const BLOCOS = new Set([
  'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'TR', 'TABLE', 'PRE',
])

export function htmlParaTexto(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const partes: string[] = []

  const percorrer = (no: Node, dentroDePre: boolean) => {
    if (no.nodeType === Node.TEXT_NODE) {
      const t = no.nodeValue ?? ''
      partes.push(dentroDePre ? t : t.replace(/\s+/g, ' '))
      return
    }
    if (!(no instanceof Element)) return
    if (no.tagName === 'BR') {
      partes.push('\n')
      return
    }
    const bloco = BLOCOS.has(no.tagName)
    if (bloco) partes.push('\n')
    for (const filho of no.childNodes) percorrer(filho, dentroDePre || no.tagName === 'PRE')
    if (bloco) partes.push('\n')
  }
  percorrer(doc.body, false)

  return partes
    .join('')
    .replace(/ /g, ' ')
    .split('\n')
    .map((linha) => linha.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
