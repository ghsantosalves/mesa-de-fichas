// Estado da mesa (só do app, nunca vai para o Zotero): posição de cada ficha,
// vista (posição e zoom) e coleção escolhida. Fica salvo no navegador e é
// gravado sozinho pouco depois de cada mudança.

import { useSyncExternalStore } from 'react'
import { t as tr, type Chave } from '../i18n.ts'

const CHAVE = 'mesa-de-fichas:mesa'
const ATRASO_MS = 700

export type Posicao = { x: number; y: number }
export type Vista = { x: number; y: number; zoom: number }
const COR_VALIDA = /^#[0-9a-f]{6}$/i
export const LARGURA_MIN_AREA = 240
export const ALTURA_MIN_AREA = 160
export const CORES = ['amarelo', 'azul', 'verde', 'rosa', 'cinza'] as const
export type Cor = (typeof CORES)[number]
/** Campos que podem ser ocultados em cada ficha (o título sempre aparece). */
export const CAMPOS = ['tese', 'conceitos', 'lembrar', 'dialogos', 'usos', 'ref', 'colecoes'] as const
export type Campo = (typeof CAMPOS)[number]
/** Nome do campo no idioma da interface. */
export const nomeCampo = (c: Campo) => tr(`campo.${c}` as Chave)
/** Campos da ficha onde dá para grifar texto. */
export const CAMPOS_GRIFO = ['tese', 'conceitos', 'lembrar', 'dialogos', 'ref'] as const
export type CampoGrifo = (typeof CAMPOS_GRIFO)[number]
/** Trecho grifado num campo: posição no texto e o próprio trecho (para achar de novo se o texto mudar). */
export type Grifo = { campo: CampoGrifo; inicio: number; fim: number; trecho: string; cor: string }
/** Lugar de uma ficha numa arrumação: posição e se está recolhida. */
export type Arrumacao = Posicao & { recolhida?: boolean }
/**
 * Estado de uma ficha na mesa. x, y e recolhida são a arrumação de "Todas as coleções";
 * porColecao guarda a arrumação própria de cada coleção (chave da coleção no Zotero).
 * Uma coleção sem arrumação própria usa a de "Todas". Cor, campos ocultos e grifos
 * valem para todas as coleções.
 */
export type EstadoFicha = Arrumacao & {
  cor?: Cor
  ocultos?: Campo[]
  grifos?: Grifo[]
  porColecao?: Record<string, Arrumacao>
}
/** Traço feito à mão na mesa (caneta ou marcador). Pontos em coordenadas da mesa: x1, y1, x2, y2… */
export type Traco = {
  id: string
  tipo: 'caneta' | 'marcador'
  cor: string
  /** Espessura do traço (em unidades da mesa). Sem ela, usa a espessura média do tipo. */
  largura?: number
  pontos: number[]
  colecao: string
}
/** Área da mesa. `colecao` é a coleção em que foi criada ('*' = aparece em todas). */
export type Area = { id: string; x: number; y: number; w: number; h: number; titulo: string; colecao: string }
/**
 * Associação da ficha `a` para a ficha `b` (chaves das notas no Zotero), com relação
 * em texto livre e anotação. dx/dy deslocam a caixa a partir do meio da seta; w/h
 * fixam seu tamanho. Nunca é apagada quando uma ficha some do Zotero. Cada coleção
 * tem suas próprias associações; as gerais (colecao '*') aparecem em todas.
 */
export type Associacao = {
  id: string
  a: string
  b: string
  rel: string
  nota: string
  /** Coleção em que a associação vale ('*' = geral, aparece em todas). */
  colecao: string
  dx?: number
  dy?: number
  w?: number
  h?: number
}
export type ModoTema = 'sistema' | 'claro' | 'escuro'
/** Cores editadas pelo usuário, por tema (nome da variável CSS → cor #rrggbb). */
export type Tema = { modo: ModoTema; cores: { claro: Record<string, string>; escuro: Record<string, string> } }
/** Cores editáveis do tema: variável CSS e o nome mostrado (chave de tradução). */
export const VARS_TEMA: [string, Chave][] = [
  ['--mesa', 'tema.fundoMesa'],
  ['--cartao', 'tema.fundoFicha'],
  ['--tinta', 'tema.texto'],
  ['--rotulo', 'tema.rotulos'],
  ['--linha', 'tema.associacoes'],
]
/** Última versão conhecida de uma ficha que sumiu do Zotero (para mostrar e decidir o que fazer). */
export type FichaRemovida = { autorAno: string; obra: string; tese: string; ref: string; colecoes: string[]; em: string }
export type EstadoMesa = {
  versao: 1
  tema: Tema
  /** Fichas que estavam na mesa e sumiram do Zotero, por chave da nota. */
  removidas: Record<string, FichaRemovida>
  /** Por chave da nota no Zotero. Fichas que sumiram do Zotero continuam aqui. */
  fichas: Record<string, EstadoFicha>
  areas: Area[]
  associacoes: Associacao[]
  desenhos: Traco[]
  /** Mostrar as anotações dentro das caixas das associações. */
  notas: boolean
  vista: Vista | null
  colecao: string
  /** Por coleção: a arrumação das fichas antes do "Mapa", para poder voltar a ela. */
  mapas: Record<string, Record<string, Arrumacao>>
}

export type Situacao =
  | { tipo: 'nova' }
  | { tipo: 'salvo' }
  | { tipo: 'pendente' }
  | { tipo: 'erro'; motivo: string }
  | { tipo: 'recuperado'; copia: string }

const numero = (v: unknown, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao)

/** Lê um objeto { chave: { x, y, recolhida } }, descartando o que não estiver certo. */
function lerArrumacoes(v: unknown): Record<string, Arrumacao> {
  const r: Record<string, Arrumacao> = {}
  if (!v || typeof v !== 'object') return r
  for (const [k, q] of Object.entries(v as Record<string, Record<string, unknown> | null>)) {
    if (!q || typeof q !== 'object') continue
    r[k] = { x: numero(q.x, 0), y: numero(q.y, 0) }
    if (q.recolhida === true) r[k].recolhida = true
  }
  return r
}

function vazio(): EstadoMesa {
  return {
    versao: 1,
    tema: { modo: 'sistema', cores: { claro: {}, escuro: {} } },
    removidas: {},
    fichas: {},
    areas: [],
    associacoes: [],
    desenhos: [],
    notas: true,
    vista: null,
    colecao: '*',
    mapas: {},
  }
}

/** Confere o que veio do armazenamento, aproveitando o que estiver certo. */
function validar(d: unknown): EstadoMesa {
  if (!d || typeof d !== 'object') throw new Error('formato desconhecido')
  const o = d as Record<string, unknown>
  const e = vazio()
  if (o.fichas && typeof o.fichas === 'object') {
    for (const [k, p] of Object.entries(o.fichas as Record<string, unknown>)) {
      const q = p as Record<string, unknown> | null
      if (!q || typeof q !== 'object') continue
      const f: EstadoFicha = { x: numero(q.x, 0), y: numero(q.y, 0) }
      if (CORES.includes(q.cor as Cor)) f.cor = q.cor as Cor
      if (q.recolhida === true) f.recolhida = true
      if (Array.isArray(q.ocultos)) {
        const ocultos = CAMPOS.filter((c) => (q.ocultos as unknown[]).includes(c))
        if (ocultos.length) f.ocultos = ocultos
      }
      if (Array.isArray(q.grifos)) {
        const grifos = (q.grifos as Record<string, unknown>[]).filter(
          (g): g is Grifo =>
            !!g &&
            CAMPOS_GRIFO.includes(g.campo as CampoGrifo) &&
            typeof g.inicio === 'number' &&
            typeof g.fim === 'number' &&
            typeof g.trecho === 'string' &&
            typeof g.cor === 'string' &&
            COR_VALIDA.test(g.cor),
        )
        if (grifos.length) f.grifos = grifos
      }
      const porColecao = lerArrumacoes(q.porColecao)
      if (Object.keys(porColecao).length) f.porColecao = porColecao
      e.fichas[k] = f
    }
  }
  if (Array.isArray(o.areas)) {
    for (const a of o.areas as Record<string, unknown>[]) {
      if (!a || typeof a !== 'object' || typeof a.id !== 'string') continue
      e.areas.push({
        id: a.id,
        x: numero(a.x, 0),
        y: numero(a.y, 0),
        w: Math.max(LARGURA_MIN_AREA, numero(a.w, 600)),
        h: Math.max(ALTURA_MIN_AREA, numero(a.h, 400)),
        titulo: typeof a.titulo === 'string' ? a.titulo : tr('area.padrao'),
        colecao: typeof a.colecao === 'string' ? a.colecao : '*',
      })
    }
  }
  if (Array.isArray(o.associacoes)) {
    for (const x of o.associacoes as Record<string, unknown>[]) {
      if (!x || typeof x !== 'object') continue
      if (typeof x.id !== 'string' || typeof x.a !== 'string' || typeof x.b !== 'string') continue
      const s: Associacao = {
        id: x.id,
        a: x.a,
        b: x.b,
        rel: typeof x.rel === 'string' ? x.rel : '',
        nota: typeof x.nota === 'string' ? x.nota : '',
        // Associações de antes das coleções separadas viram gerais.
        colecao: typeof x.colecao === 'string' && x.colecao ? x.colecao : '*',
      }
      for (const k of ['dx', 'dy', 'w', 'h'] as const) {
        if (typeof x[k] === 'number' && Number.isFinite(x[k])) s[k] = x[k] as number
      }
      e.associacoes.push(s)
    }
  }
  if (Array.isArray(o.desenhos)) {
    for (const t of o.desenhos as Record<string, unknown>[]) {
      if (!t || typeof t.id !== 'string' || !Array.isArray(t.pontos)) continue
      if (t.tipo !== 'caneta' && t.tipo !== 'marcador') continue
      if (typeof t.cor !== 'string' || !COR_VALIDA.test(t.cor)) continue
      const pontos = (t.pontos as unknown[]).filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
      if (pontos.length < 4 || pontos.length % 2) continue
      const traco: Traco = { id: t.id, tipo: t.tipo, cor: t.cor, pontos, colecao: typeof t.colecao === 'string' ? t.colecao : '*' }
      if (typeof t.largura === 'number' && t.largura > 0 && t.largura <= 60) traco.largura = t.largura
      e.desenhos.push(traco)
    }
  }
  if (o.notas === false) e.notas = false
  if (o.removidas && typeof o.removidas === 'object') {
    const texto = (v: unknown) => (typeof v === 'string' ? v : '')
    for (const [k, r] of Object.entries(o.removidas as Record<string, Record<string, unknown>>)) {
      if (!r || typeof r !== 'object') continue
      e.removidas[k] = {
        autorAno: texto(r.autorAno),
        obra: texto(r.obra),
        tese: texto(r.tese),
        ref: texto(r.ref),
        colecoes: Array.isArray(r.colecoes) ? r.colecoes.filter((c): c is string => typeof c === 'string') : [],
        em: texto(r.em),
      }
    }
  }
  const t = o.tema as Record<string, unknown> | null
  if (t && typeof t === 'object') {
    if (t.modo === 'claro' || t.modo === 'escuro' || t.modo === 'sistema') e.tema.modo = t.modo
    const cores = t.cores as Record<string, Record<string, unknown>> | null
    for (const qual of ['claro', 'escuro'] as const) {
      const c = cores?.[qual]
      if (!c || typeof c !== 'object') continue
      for (const [nome] of VARS_TEMA) {
        if (typeof c[nome] === 'string' && /^#[0-9a-f]{6}$/i.test(c[nome] as string)) e.tema.cores[qual][nome] = c[nome] as string
      }
    }
  }
  const v = o.vista as Record<string, unknown> | null
  if (v && typeof v === 'object') e.vista = { x: numero(v.x, 0), y: numero(v.y, 0), zoom: numero(v.zoom, 1) }
  if (o.mapas && typeof o.mapas === 'object') {
    for (const [c, lista] of Object.entries(o.mapas as Record<string, unknown>)) {
      const antes = lerArrumacoes(lista)
      if (Object.keys(antes).length) e.mapas[c] = antes
    }
  }
  if (typeof o.colecao === 'string') e.colecao = o.colecao
  return e
}

function ler(): { estado: EstadoMesa; situacao: Situacao } {
  let texto: string | null
  try {
    texto = localStorage.getItem(CHAVE)
  } catch {
    return { estado: vazio(), situacao: { tipo: 'erro', motivo: tr('salvo.semAcesso') } }
  }
  if (texto === null) return { estado: vazio(), situacao: { tipo: 'nova' } }
  try {
    return { estado: validar(JSON.parse(texto)), situacao: { tipo: 'salvo' } }
  } catch {
    // Nunca jogar fora em silêncio: guarda uma cópia do que estava lá antes de recomeçar.
    const copia = `${CHAVE}:copia-${new Date().toISOString()}`
    try {
      localStorage.setItem(copia, texto)
    } catch {
      /* sem espaço para a cópia; segue mesmo assim */
    }
    return { estado: vazio(), situacao: { tipo: 'recuperado', copia } }
  }
}

const inicial = ler()
/** O estado atual da mesa. Para mudar, use `alterarMesa`. */
export const mesa: EstadoMesa = inicial.estado
/** Este navegador ainda não tinha mesa guardada (primeira vez aqui, ou dados apagados). */
export const mesaEraNova = inicial.situacao.tipo === 'nova'
/** Quem quer saber quando a mesa foi gravada (ex.: a cópia no Zotero). */
const aoGravar = new Set<() => void>()
export function aoGravarMesa(f: () => void) {
  aoGravar.add(f)
  return () => aoGravar.delete(f)
}
let situacao: Situacao = inicial.situacao
let temporizador: ReturnType<typeof setTimeout> | null = null
const ouvintes = new Set<() => void>()

function avisar(s: Situacao) {
  situacao = s
  ouvintes.forEach((f) => f())
}

function gravar() {
  if (temporizador) clearTimeout(temporizador)
  temporizador = null
  try {
    localStorage.setItem(CHAVE, JSON.stringify(mesa))
    avisar({ tipo: 'salvo' })
    aoGravar.forEach((f) => f())
  } catch {
    avisar({ tipo: 'erro', motivo: tr('salvo.erro') })
  }
}

/** Muda o estado e agenda a gravação. */
/** Conteúdo do arquivo .json com a mesa inteira (o conteúdo das fichas fica no Zotero). */
export function arquivoDaMesa(): string {
  return JSON.stringify({ formato: 'mesa-de-fichas', versao: 1, salvoEm: new Date().toISOString(), mesa }, null, 1)
}

/** Lê um arquivo salvo por `arquivoDaMesa`. Lança erro se não for uma mesa. */
export function lerArquivoDaMesa(texto: string): EstadoMesa {
  const d = JSON.parse(texto) as Record<string, unknown>
  if (!d || d.formato !== 'mesa-de-fichas' || !d.mesa) throw new Error('não é uma mesa')
  return validar(d.mesa)
}

/**
 * Troca a mesa atual por outra. Antes, guarda no navegador uma cópia da atual,
 * para nada se perder. Depois disso a página deve ser recarregada.
 */
export function substituirMesa(nova: EstadoMesa) {
  try {
    localStorage.setItem(`${CHAVE}:copia-${new Date().toISOString()}`, JSON.stringify(mesa))
  } catch {
    /* sem espaço para a cópia; segue mesmo assim */
  }
  for (const k of Object.keys(mesa) as (keyof EstadoMesa)[]) delete mesa[k]
  Object.assign(mesa, nova)
  gravar()
}

export function alterarMesa(mudar: (e: EstadoMesa) => void) {
  mudar(mesa)
  if (temporizador) clearTimeout(temporizador)
  temporizador = setTimeout(gravar, ATRASO_MS)
  if (situacao.tipo !== 'pendente') avisar({ tipo: 'pendente' })
}

// Ao fechar ou recarregar a página, grava na hora o que estiver pendente.
addEventListener('pagehide', () => {
  if (temporizador) gravar()
})

export function useSituacao(): Situacao {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => situacao,
  )
}

export const arredondar = (p: Posicao): Posicao => ({ x: Math.round(p.x), y: Math.round(p.y) })

/** Arrumação de uma ficha na coleção dada (a própria, ou a de "Todas" se ainda não tiver). */
export function lugarNaColecao(f: EstadoFicha | undefined, colecao: string): Required<Arrumacao> | undefined {
  if (!f) return undefined
  const l = (colecao !== '*' && f.porColecao?.[colecao]) || f
  return { x: l.x, y: l.y, recolhida: !!l.recolhida }
}

/** Arrumação da coleção atual que vai ser mudada (cria a da coleção, se preciso). */
function arrumacaoAtual(e: EstadoMesa, chave: string, p: Posicao): Arrumacao {
  const f = (e.fichas[chave] ??= arredondar(p))
  if (e.colecao === '*') return f
  f.porColecao ??= {}
  return (f.porColecao[e.colecao] ??= { x: f.x, y: f.y, ...(f.recolhida ? { recolhida: true } : {}) })
}

/** Muda a posição de uma ficha na coleção atual, sem perder a cor e o recolhimento. */
export function posicionarFicha(e: EstadoMesa, chave: string, p: Posicao) {
  Object.assign(arrumacaoAtual(e, chave, p), arredondar(p))
}

/** Recolhe ou abre uma ficha na coleção atual. */
export function recolherFicha(e: EstadoMesa, chave: string, recolhida: boolean, p: Posicao) {
  const a = arrumacaoAtual(e, chave, p)
  if (recolhida) a.recolhida = true
  else delete a.recolhida
}

/** A associação aparece na coleção dada? (as gerais aparecem em todas) */
export const associacaoNaColecao = (a: Pick<Associacao, 'colecao'>, colecao: string) =>
  a.colecao === '*' || a.colecao === colecao
