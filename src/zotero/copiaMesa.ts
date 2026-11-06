// Cópia da mesa no Zotero: a arrumação inteira (posições, áreas, associações,
// anotações, desenhos, tema) fica guardada numa nota do próprio app, com a tag
// "cordatril-mesa". Como o Zotero sincroniza, a cópia chega aos outros computadores.
//
// - Com chave que pode escrever, a cópia é atualizada sozinha uns minutos depois de
//   cada mudança (no site; rodando no computador com npm run dev, só pelo botão).
// - Num navegador sem mesa, o app oferece recuperar a mesa a partir da cópia.
// - Com chave só de leitura, o app lembra de salvar a mesa em arquivo de vez em quando.
//
// Esta nota é a única coisa (além das fichas novas) que o app escreve no Zotero; ele só
// mexe na nota com a tag "cordatril-mesa", nunca em outras.

import { useSyncExternalStore } from 'react'
import { atualizarItem, buscarJson, caminhoUsuario, enviarJson, ErroZotero } from './api.ts'
import { podeEscrever } from './cadastro.ts'
import { lerCredenciais, MODO_LOCAL } from './credenciais.ts'
import { aoGravarMesa, arquivoDaMesa, lerArquivoDaMesa, mesa, mesaEraNova, type EstadoMesa } from '../estado/mesa.ts'
import { data, t } from '../i18n.ts'

export const TAG_COPIA = 'cordatril-mesa'
const CHAVE_COPIA_EM = 'mesa-de-fichas:copia-zotero-em'
const CHAVE_ARQUIVO_EM = 'mesa-de-fichas:arquivo-em'
const CHAVE_DESDE = 'mesa-de-fichas:lembrete-desde'
/** Espera depois da última mudança antes de atualizar a cópia (evita uma escrita por clique). */
const ESPERA_MS = 2 * 60 * 1000
/** Dias sem nenhuma cópia (arquivo ou Zotero) até o app lembrar. */
const DIAS_LEMBRETE = 14
/** Tamanho máximo da nota (por segurança; uma mesa normal fica muito abaixo disso). */
const MAXIMO = 900_000

type NotaCopia = { key: string; version: number; data: { note: string; dateModified?: string } }
export type CopiaNoZotero = { quando: string; mesa: EstadoMesa }

const lerData = (chave: string) => {
  try {
    return localStorage.getItem(chave) ?? ''
  } catch {
    return ''
  }
}
const marcarAgora = (chave: string) => {
  try {
    localStorage.setItem(chave, new Date().toISOString())
  } catch {
    /* sem espaço: só não guarda a data */
  }
}
if (!lerData(CHAVE_DESDE)) marcarAgora(CHAVE_DESDE)

// --- Ler e escrever a nota ---

async function notaDaCopia(): Promise<NotaCopia | null> {
  const { dados } = await buscarJson<NotaCopia[]>(
    `${caminhoUsuario()}/items?tag=${TAG_COPIA}&itemType=note&sort=dateModified&direction=desc&limit=1`,
  )
  return dados[0] ?? null
}

/** A cópia guardada no Zotero (ou null se não houver, ou se não der para ler). */
export async function buscarCopia(): Promise<CopiaNoZotero | null> {
  const n = await notaDaCopia()
  if (!n) return null
  const pre = new DOMParser().parseFromString(n.data.note, 'text/html').querySelector('pre')
  try {
    return { quando: n.data.dateModified ?? '', mesa: lerArquivoDaMesa(pre?.textContent ?? '') }
  } catch {
    return null
  }
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Guarda a mesa atual na nota de cópia (cria a nota na primeira vez). */
export async function guardarCopia(): Promise<void> {
  const json = arquivoDaMesa()
  if (json.length > MAXIMO) throw new ErroZotero(t('copia.grande'))
  const note = [
    `<h1>${escapar(t('copia.tituloNota'))}</h1>`,
    `<p>${escapar(t('copia.avisoNota', { data: data(new Date()) }))}</p>`,
    `<pre>${escapar(json)}</pre>`,
  ].join('\n')
  const usuario = caminhoUsuario()
  // Duas tentativas: se outro computador atualizou a nota no meio, lê a versão nova e repete.
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const n = await notaDaCopia()
    if (!n) {
      const token = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')
      const r = await enviarJson<{ success?: Record<string, string> }>(
        `${usuario}/items`,
        [{ itemType: 'note', note, tags: [{ tag: TAG_COPIA }], collections: [], relations: {} }],
        { 'Zotero-Write-Token': token },
      )
      if (!r.success?.['0']) throw new ErroZotero(t('copia.falhou'))
      break
    }
    if (await atualizarItem(`${usuario}/items/${n.key}`, { note }, n.version)) break
    if (tentativa === 1) throw new ErroZotero(t('copia.falhou'))
  }
  marcarAgora(CHAVE_COPIA_EM)
  mudar({ ...estado, erro: null })
}

/** O usuário salvou a mesa em arquivo (conta como cópia, para o lembrete). */
export function marcarArquivoSalvo() {
  marcarAgora(CHAVE_ARQUIVO_EM)
  mudar({ ...estado })
}

// --- Cópia automática e situação (para o aviso no canto) ---

type Estado = {
  /** A chave pode escrever? null = ainda não se sabe. */
  escrita: boolean | null
  /** Guardando agora. */
  guardando: boolean
  erro: string | null
}
let estado: Estado = { escrita: null, guardando: false, erro: null }
const ouvintes = new Set<() => void>()
function mudar(novo: Estado) {
  estado = novo
  ouvintes.forEach((f) => f())
}
export function useCopiaZotero() {
  const e = useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => estado,
  )
  return { ...e, copiaEm: lerData(CHAVE_COPIA_EM), diasSemCopia: diasSemCopia() }
}

/** Dias desde a última cópia (arquivo ou Zotero) ou desde que o app começou a contar. */
function diasSemCopia(): number {
  const ultima = [CHAVE_COPIA_EM, CHAVE_ARQUIVO_EM, CHAVE_DESDE]
    .map((k) => Date.parse(lerData(k)))
    .filter((n) => !Number.isNaN(n))
  if (!ultima.length || !Object.keys(mesa.fichas).length) return 0
  return Math.floor((Date.now() - Math.max(...ultima)) / 86_400_000)
}
export const precisaLembrar = (dias: number) => dias >= DIAS_LEMBRETE

/**
 * Num navegador sem mesa, a cópia automática fica parada até se decidir o que fazer
 * com a cópia que já está no Zotero (para não trocá-la por uma mesa vazia).
 */
let bloqueada = mesaEraNova
export function liberarCopiaAutomatica() {
  bloqueada = false
}

let espera: ReturnType<typeof setTimeout> | null = null
async function guardarSozinho() {
  if (bloqueada || !estado.escrita || estado.guardando) return
  mudar({ ...estado, guardando: true })
  try {
    await guardarCopia()
    mudar({ ...estado, guardando: false, erro: null })
  } catch (e) {
    mudar({ ...estado, guardando: false, erro: e instanceof Error ? e.message : String(e) })
  }
}

let iniciada = false
/** Liga a cópia automática (uma vez, depois de conectar ao Zotero). */
export function iniciarCopiaAutomatica() {
  if (iniciada || !lerCredenciais()) return
  iniciada = true
  podeEscrever()
    .then((v) => mudar({ ...estado, escrita: v }))
    .catch(() => mudar({ ...estado, escrita: false }))
  // No computador (npm run dev), só pelo botão: evita copiar mesas de teste por engano.
  if (MODO_LOCAL) return
  aoGravarMesa(() => {
    if (espera) clearTimeout(espera)
    espera = setTimeout(guardarSozinho, ESPERA_MS)
  })
}
