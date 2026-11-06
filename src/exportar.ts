// Exportações: imagem PNG da mesa visível, resumo das associações em Markdown
// e download de arquivos.

import { getNodesBounds, type ReactFlowInstance } from '@xyflow/react'
import { toPng } from 'html-to-image'
import { associacaoNaColecao, lugarNaColecao, mesa, type Associacao } from './estado/mesa.ts'
import { comSubcolecoes, type Biblioteca, type Ficha } from './zotero/biblioteca.ts'
import type { NoMesa } from './mesa/operacoes.ts'
import { normalizar } from './mesa/contexto.ts'
import { NOME_APP, data as dataNoIdioma, t as tr } from './i18n.ts'

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

/** Nome de arquivo com a coleção e a data, ex.: cordatril-leituras-2026-11-05.png */
export function nomeArquivo(bib: Biblioteca, colecao: string, ext: string, prefixo = 'cordatril') {
  const nome = colecao === '*' ? tr('md.todas') : (bib.colecoes.find((c) => c.chave === colecao)?.nome ?? 'colecao')
  const slug = normalizar(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${prefixo}-${slug}-${hoje()}.${ext}`
}

/** Gera o PNG com tudo o que está visível na coleção atual (fichas, áreas, associações). */
export async function imagemDaMesa(rf: ReactFlowInstance<NoMesa>): Promise<Blob> {
  const visiveis = rf.getNodes().filter((n) => !n.hidden)
  if (!visiveis.length) throw new Error(tr('exp.nadaVisivel'))
  // Enquadramento: as fichas e áreas, e também as caixas das associações e os
  // desenhos (que podem passar das fichas e ficavam cortados).
  const nos = getNodesBounds(visiveis)
  let esq = nos.x
  let cima = nos.y
  let dir = nos.x + nos.width
  let baixo = nos.y + nos.height
  const incluir = (x1: number, y1: number, x2: number, y2: number) => {
    esq = Math.min(esq, x1)
    cima = Math.min(cima, y1)
    dir = Math.max(dir, x2)
    baixo = Math.max(baixo, y2)
  }
  for (const el of document.querySelectorAll<HTMLElement>('.mesa .assoc')) {
    if (!el.offsetParent || el.classList.contains('apagada')) continue
    const r = el.getBoundingClientRect()
    const a = rf.screenToFlowPosition({ x: r.left, y: r.top })
    const b = rf.screenToFlowPosition({ x: r.right, y: r.bottom })
    incluir(a.x, a.y, b.x, b.y)
  }
  for (const el of document.querySelectorAll<SVGGraphicsElement>('.mesa svg.desenhos path')) {
    try {
      const c = el.getBBox()
      if (c.width || c.height) incluir(c.x, c.y, c.x + c.width, c.y + c.height)
    } catch {
      /* traço sem medida: ignora */
    }
  }
  const margem = 40
  const limites = { x: esq - margem, y: cima - margem, width: dir - esq + margem * 2, height: baixo - cima + margem * 2 }
  // Resolução: 2× o tamanho da mesa (texto nítido ao ampliar), com um limite seguro
  // (cerca de 40 megapixels e 16 mil pixels por lado) para mesas muito grandes.
  const escala = Math.min(2, 16000 / limites.width, 16000 / limites.height, Math.sqrt(40_000_000 / (limites.width * limites.height)))
  const largura = Math.round(limites.width * escala)
  const altura = Math.round(limites.height * escala)
  const vista = { x: -limites.x * escala, y: -limites.y * escala, zoom: escala }
  const alvo = document.querySelector<HTMLElement>('.mesa .react-flow__viewport')
  if (!alvo) throw new Error('Mesa não encontrada.')
  const fundo = getComputedStyle(document.documentElement).getPropertyValue('--mesa').trim()

  // As setas ficam numa camada SVG sem tamanho definido; na tela ela "transborda",
  // mas a captura corta o que passa do tamanho padrão. Durante a captura, a camada
  // ganha o tamanho exato da área exportada; depois volta ao que era.
  const svgs = [...alvo.querySelectorAll<SVGSVGElement>('.react-flow__edges svg, svg.desenhos')]
  const antes = svgs.map((s) => ['style', 'viewBox', 'width', 'height'].map((a) => s.getAttribute(a)))
  const x0 = Math.floor(limites.x)
  const y0 = Math.floor(limites.y)
  const w0 = Math.ceil(limites.width)
  const h0 = Math.ceil(limites.height)
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
  const p = lugarNaColecao(mesa.fichas[f.chave], colecao)
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
  const nomeColecao = colecao === '*' ? tr('md.todas') : nomeCol.get(colecao)
  const data = dataNoIdioma(new Date())

  let t = `${tr('md.claudeTitulo', { app: NOME_APP })}\n\n`
  t += `${tr('md.claudeLinha', { col: nomeColecao ?? '', n: fichas.length, data })}\n\n`
  t += `${tr('md.claudeIntro')}\n\n${tr('md.fichas')}\n`

  for (const f of fichas) {
    t += `\n### [${f.chave}] ${f.titulo}\n`
    if (f.ref) t += `- ${tr('md.referencia')}: ${f.ref}\n`
    t += `- ${tr('md.tese')}: ${f.tese || '—'}\n`
    if (f.conceitos.length) t += `- ${tr('md.conceitos')}: ${f.conceitos.join('; ')}\n`
    if (f.lembrar) t += `- ${tr('md.lembrar')}: ${f.lembrar}\n`
    if (f.dialogos.length) t += `- ${tr('md.dialogos')}: ${f.dialogos.join('; ')}\n`
    if (f.usos.length) t += `- ${tr('md.usos')}: ${f.usos.join(', ')}\n`
    const cols = f.colecoes.map((k) => nomeCol.get(k)).filter(Boolean)
    if (cols.length) t += `- ${tr('md.colecoes')}: ${cols.join('; ')}\n`
    const area = areaDe(f, colecao)
    if (area) t += `- ${tr('md.area')}: ${area}\n`
  }

  const existentes = mesa.associacoes.filter(
    (a) => porChave.has(a.a) && porChave.has(a.b) && associacaoNaColecao(a, colecao),
  )
  t += `\n${tr('md.existentes')}\n\n`
  if (!existentes.length) t += `${tr('md.nenhumaAinda')}\n`
  for (const a of existentes) {
    const nota = a.nota.trim() ? `: ${a.nota.trim().replace(/\s+/g, ' ')}` : ''
    t += `- [${a.a}] ${porChave.get(a.a)!.autorAno} → ${a.rel.trim() || tr('md.aDefinir')} → [${a.b}] ${porChave.get(a.b)!.autorAno}${nota}\n`
  }
  return t
}

/** Resumo das associações visíveis, em Markdown. */
export function resumoAssociacoes(bib: Biblioteca, colecao: string, completa: boolean): string {
  const visiveis = new Map(fichasVisiveis(bib, colecao).map((f) => [f.chave, f]))
  const lista = mesa.associacoes.filter(
    (a) => visiveis.has(a.a) && visiveis.has(a.b) && associacaoNaColecao(a, colecao),
  )
  const nomeColecao = colecao === '*' ? tr('md.todas') : bib.colecoes.find((c) => c.chave === colecao)?.nome
  const data = dataNoIdioma(new Date())

  let t = `${tr('md.resumoTitulo', { col: nomeColecao ?? '' })}\n\n`
  t += `${tr('md.resumoIntro', { app: NOME_APP, data })}\n`

  const ficha = (f: Ficha) => {
    let s = `- ${tr('md.referencia')}: ${f.ref || f.titulo}\n- ${tr('md.tese')}: ${f.tese || '—'}\n`
    if (completa) {
      if (f.conceitos.length) s += `- ${tr('md.conceitos')}: ${f.conceitos.join('; ')}\n`
      if (f.lembrar) s += `- ${tr('md.lembrar')}: ${f.lembrar}\n`
      if (f.dialogos.length) s += `- ${tr('md.dialogos')}: ${f.dialogos.join('; ')}\n`
      if (f.usos.length) s += `- ${tr('md.usos')}: ${f.usos.join(', ')}\n`
    }
    const area = areaDe(f, colecao)
    if (area) s += `- ${tr('md.area')}: ${area}\n`
    return s
  }

  lista.forEach((a: Associacao, i) => {
    const A = visiveis.get(a.a)!
    const B = visiveis.get(a.b)!
    const rel = a.rel.trim() || tr('md.aDefinir')
    t += `\n## ${i + 1}. ${A.autorAno} → ${rel} → ${B.autorAno}\n\n`
    t += `**${tr('md.textoA')}:** ${A.titulo}\n${ficha(A)}\n**${tr('md.textoB')}:** ${B.titulo}\n${ficha(B)}\n`
    t += `**${tr('md.relacao')}:** A ${rel} B\n\n**${tr('md.anotacao')}:** ${a.nota.trim() || tr('md.semAnotacao')}\n`
  })
  if (!lista.length) t += `\n${tr('md.nenhuma')}\n`
  return t
}
