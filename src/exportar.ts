// Exportações: imagem PNG da mesa visível, resumo das associações em Markdown
// e download de arquivos.

import { getNodesBounds, getViewportForBounds, type ReactFlowInstance } from '@xyflow/react'
import { toPng } from 'html-to-image'
import { mesa, type Associacao } from './estado/mesa.ts'
import { comSubcolecoes, type Biblioteca, type Ficha } from './zotero/biblioteca.ts'
import type { NoMesa } from './mesa/operacoes.ts'
import { normalizar } from './mesa/contexto.ts'

export function baixar(nome: string, conteudo: Blob | string, tipo = 'text/plain;charset=utf-8') {
  const blob = typeof conteudo === 'string' ? new Blob([conteudo], { type: tipo }) : conteudo
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const hoje = () => new Date().toISOString().slice(0, 10)

/** Nome de arquivo com a coleção e a data, ex.: mesa-de-fichas-prova-ppgh-2026-11-05.png */
export function nomeArquivo(bib: Biblioteca, colecao: string, ext: string, prefixo = 'mesa-de-fichas') {
  const nome = colecao === '*' ? 'todas' : (bib.colecoes.find((c) => c.chave === colecao)?.nome ?? 'colecao')
  const slug = normalizar(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${prefixo}-${slug}-${hoje()}.${ext}`
}

/** Gera o PNG com tudo o que está visível na coleção atual (fichas, áreas, associações). */
export async function imagemDaMesa(rf: ReactFlowInstance<NoMesa>): Promise<Blob> {
  const visiveis = rf.getNodes().filter((n) => !n.hidden)
  if (!visiveis.length) throw new Error('Não há nada visível para exportar.')
  const limites = getNodesBounds(visiveis)
  // Margem para os títulos das áreas e as caixas das associações.
  const margem = 80
  const largura = Math.min(6000, Math.round((limites.width + margem * 2) * 1.5))
  const altura = Math.min(6000, Math.round((limites.height + margem * 2) * 1.5))
  const vista = getViewportForBounds(limites, largura, altura, 0.2, 2, `${margem}px`)
  const alvo = document.querySelector<HTMLElement>('.mesa .react-flow__viewport')
  if (!alvo) throw new Error('Mesa não encontrada.')
  const fundo = getComputedStyle(document.documentElement).getPropertyValue('--mesa').trim()

  // As setas ficam numa camada SVG sem tamanho definido; na tela ela "transborda",
  // mas a captura corta o que passa do tamanho padrão. Durante a captura, a camada
  // ganha o tamanho exato da área exportada; depois volta ao que era.
  const svgs = [...alvo.querySelectorAll<SVGSVGElement>('.react-flow__edges svg, svg.desenhos')]
  const antes = svgs.map((s) => ['style', 'viewBox', 'width', 'height'].map((a) => s.getAttribute(a)))
  const x0 = Math.floor(limites.x - margem * 2)
  const y0 = Math.floor(limites.y - margem * 2)
  const w0 = Math.ceil(limites.width + margem * 4)
  const h0 = Math.ceil(limites.height + margem * 4)
  for (const s of svgs) {
    s.setAttribute('viewBox', `${x0} ${y0} ${w0} ${h0}`)
    s.setAttribute('width', String(w0))
    s.setAttribute('height', String(h0))
    s.style.left = `${x0}px`
    s.style.top = `${y0}px`
  }
  // A captura não leva as cores das setas (definidas por classes CSS): durante a
  // captura, elas são escritas direto em cada linha e ponta de seta.
  const formas = [...alvo.querySelectorAll<SVGElement>('svg path, svg line')]
  const PROPS = ['stroke', 'stroke-width', 'stroke-dasharray', 'fill', 'opacity']
  const formasAntes = formas.map((el) => PROPS.map((p) => el.getAttribute(p)))
  for (const el of formas) {
    const cs = getComputedStyle(el)
    for (const p of PROPS) el.setAttribute(p, cs.getPropertyValue(p))
  }
  try {
    const url = await toPng(alvo, {
      backgroundColor: fundo,
      width: largura,
      height: altura,
      pixelRatio: 1,
      style: {
        width: `${largura}px`,
        height: `${altura}px`,
        transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.zoom})`,
      },
    })
    return await (await fetch(url)).blob()
  } finally {
    formas.forEach((el, i) =>
      PROPS.forEach((p, j) => {
        const v = formasAntes[i][j]
        if (v === null) el.removeAttribute(p)
        else el.setAttribute(p, v)
      }),
    )
    svgs.forEach((s, i) =>
      ['style', 'viewBox', 'width', 'height'].forEach((a, j) => {
        const v = antes[i][j]
        if (v === null) s.removeAttribute(a)
        else s.setAttribute(a, v)
      }),
    )
  }
}

/** Fichas visíveis na coleção atual. */
function fichasVisiveis(bib: Biblioteca, colecao: string): Ficha[] {
  if (colecao === '*') return bib.fichas
  const chaves = comSubcolecoes(colecao, bib.colecoes)
  return bib.fichas.filter((f) => f.colecoes.some((k) => chaves.has(k)))
}

/** Título da área (visível na coleção) em que está a ficha, pelo topo-centro dela. */
function areaDe(f: Ficha, colecao: string): string {
  const p = mesa.fichas[f.chave]
  if (!p) return ''
  const cx = p.x + (p.recolhida ? 120 : 150)
  const cy = p.y + 40
  const a = mesa.areas.find(
    (a) =>
      (colecao === '*' || a.colecao === '*' || a.colecao === colecao) &&
      cx > a.x && cx < a.x + a.w && cy > a.y && cy < a.y + a.h,
  )
  return a?.titulo.trim() ?? ''
}

/**
 * Pacote para o Claude (skill "relacoes-entre-textos"): as fichas visíveis com seus
 * identificadores (chaves do Zotero) e as associações que já existem entre elas.
 */
export function pacoteParaClaude(bib: Biblioteca, colecao: string): string {
  const fichas = fichasVisiveis(bib, colecao)
  const porChave = new Map(fichas.map((f) => [f.chave, f]))
  const nomeCol = new Map(bib.colecoes.map((c) => [c.chave, c.nome]))
  const nomeColecao = colecao === '*' ? 'todas as coleções' : nomeCol.get(colecao)
  const data = new Date().toLocaleDateString('pt-BR')

  let t = `# Fichas para o Claude — Mesa de fichas\n\n`
  t += `Coleção: ${nomeColecao} · ${fichas.length} fichas · exportado em ${data}\n\n`
  t +=
    'Use com a skill "relacoes-entre-textos". Cada ficha tem um identificador entre colchetes, ' +
    'como [ABCD1234]; as associações sugeridas devem usar esses identificadores para que a Mesa ' +
    'as coloque nas fichas certas.\n\n## Fichas\n'

  for (const f of fichas) {
    t += `\n### [${f.chave}] ${f.titulo}\n`
    if (f.ref) t += `- Referência: ${f.ref}\n`
    t += `- Tese: ${f.tese || '—'}\n`
    if (f.conceitos.length) t += `- Conceitos: ${f.conceitos.join('; ')}\n`
    if (f.lembrar) t += `- Para lembrar: ${f.lembrar}\n`
    if (f.dialogos.length) t += `- Diálogos: ${f.dialogos.join('; ')}\n`
    if (f.usos.length) t += `- Uso no projeto: ${f.usos.join(', ')}\n`
    const cols = f.colecoes.map((k) => nomeCol.get(k)).filter(Boolean)
    if (cols.length) t += `- Coleções: ${cols.join('; ')}\n`
    const area = areaDe(f, colecao)
    if (area) t += `- Área na mesa: ${area}\n`
  }

  const existentes = mesa.associacoes.filter((a) => porChave.has(a.a) && porChave.has(a.b))
  t += '\n## Associações que já existem\n\n'
  if (!existentes.length) t += 'Nenhuma ainda.\n'
  for (const a of existentes) {
    const nota = a.nota.trim() ? `: ${a.nota.trim().replace(/\s+/g, ' ')}` : ''
    t += `- [${a.a}] ${porChave.get(a.a)!.autorAno} → ${a.rel.trim() || '(relação a definir)'} → [${a.b}] ${porChave.get(a.b)!.autorAno}${nota}\n`
  }
  return t
}

/** Resumo das associações visíveis, em Markdown. */
export function resumoAssociacoes(bib: Biblioteca, colecao: string, completa: boolean): string {
  const visiveis = new Map(fichasVisiveis(bib, colecao).map((f) => [f.chave, f]))
  const lista = mesa.associacoes.filter((a) => visiveis.has(a.a) && visiveis.has(a.b))
  const nomeColecao = colecao === '*' ? 'todas as coleções' : bib.colecoes.find((c) => c.chave === colecao)?.nome
  const data = new Date().toLocaleDateString('pt-BR')

  let t = `# Associações entre textos (${nomeColecao})\n\n`
  t +=
    `Exportado da Mesa de fichas em ${data}. Cada item liga dois textos: a relação e a anotação foram ` +
    `escritas pelo pesquisador; os resumos vêm das fichas de leitura, com páginas entre colchetes ` +
    `([p. ?] = página a conferir).\n`

  const ficha = (f: Ficha) => {
    let s = `- Referência: ${f.ref || f.titulo}\n- Tese: ${f.tese || '—'}\n`
    if (completa) {
      if (f.conceitos.length) s += `- Conceitos: ${f.conceitos.join('; ')}\n`
      if (f.lembrar) s += `- Para lembrar: ${f.lembrar}\n`
      if (f.dialogos.length) s += `- Diálogos: ${f.dialogos.join('; ')}\n`
      if (f.usos.length) s += `- Uso no projeto: ${f.usos.join(', ')}\n`
    }
    const area = areaDe(f, colecao)
    if (area) s += `- Área na mesa: ${area}\n`
    return s
  }

  lista.forEach((a: Associacao, i) => {
    const A = visiveis.get(a.a)!
    const B = visiveis.get(a.b)!
    const rel = a.rel.trim() || '(relação a definir)'
    t += `\n## ${i + 1}. ${A.autorAno} → ${rel} → ${B.autorAno}\n\n`
    t += `**Texto A:** ${A.titulo}\n${ficha(A)}\n**Texto B:** ${B.titulo}\n${ficha(B)}\n`
    t += `**Relação:** A ${rel} B\n\n**Anotação:** ${a.nota.trim() || '(sem anotação)'}\n`
  })
  if (!lista.length) t += '\nNenhuma associação nesta coleção.\n'
  return t
}
