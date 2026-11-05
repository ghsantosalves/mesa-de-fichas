// Interpreta o texto de uma ficha no formato da skill ficha-academica.
// Problemas impedem a ficha de ir para a mesa; avisos não.
// Aceita os rótulos em português e em inglês (CARD ·, Thesis:, Concepts: …).

import { t as tr, type Chave as ChaveTexto } from '../i18n.ts'

export type CamposFicha = {
  titulo: string
  autorAno: string
  obra: string
  ref: string
  tese: string
  conceitos: string[]
  lembrar: string
  dialogos: string[]
  usos: string[]
  video: string
  fichamento: string
}

export type Interpretacao =
  | { ok: true; campos: CamposFicha; avisos: string[] }
  | { ok: false; titulo: string; motivos: string[] }

type Chave = 'ref' | 'tese' | 'conceitos' | 'lembrar' | 'dialogos' | 'uso' | 'video' | 'fichamento'

/** Rótulos na ordem fixa do formato (português | inglês). */
const ROTULOS: { chave: Chave; padrao: string }[] = [
  { chave: 'ref', padrao: 'Ref\\.?|Reference' },
  { chave: 'tese', padrao: 'Tese|Thesis' },
  { chave: 'conceitos', padrao: 'Conceitos|Concepts' },
  { chave: 'lembrar', padrao: 'Para lembrar|To remember' },
  { chave: 'dialogos', padrao: 'Di[aá]logos|Dialogues' },
  { chave: 'uso', padrao: 'Usos?|Uses?' },
  { chave: 'video', padrao: 'V[ií]deo' },
  { chave: 'fichamento', padrao: 'Fichamento completo|Full notes' },
]
/** Nome do campo, no idioma da interface, para as mensagens. */
const nome = (c: Chave) => tr(`rotulo.${c}` as ChaveTexto)
const LINHA_ROTULO = new RegExp(`^(${ROTULOS.map((r) => r.padrao).join('|')})\\s*:\\s*(.*)$`, 'i')
const LINHA_TITULO = /^(?:FICHA|CARD)\b\s*[·•:\-–—]?\s*(.*)$/i
const VAZIO = /^[—–-]?$/

const lista = (v: string) =>
  v
    .split(/\s*·\s*/)
    .map((s) => s.trim())
    .filter((s) => !VAZIO.test(s))

const valor = (v: string) => (VAZIO.test(v.trim()) ? '' : v.trim())

function qualRotulo(nome: string): Chave {
  return ROTULOS.find((r) => new RegExp(`^(?:${r.padrao})$`, 'i').test(nome))!.chave
}

export function interpretarFicha(textoBruto: string): Interpretacao {
  const linhas = textoBruto.normalize('NFC').split('\n')
  const motivos: string[] = []
  const avisos: string[] = []

  // 1. Título: primeira linha não vazia, começando com "FICHA ·".
  const iTitulo = linhas.findIndex((l) => l.trim() !== '')
  const primeira = iTitulo >= 0 ? linhas[iTitulo].trim() : ''
  const m = primeira.match(LINHA_TITULO)
  if (!m) {
    return {
      ok: false,
      titulo: primeira.slice(0, 120),
      motivos: [primeira ? tr('int.semFicha') : tr('int.vazia')],
    }
  }
  const titulo = m[1].trim()

  // 2. "Autor (ano)" é tudo até o primeiro ")"; o resto é obra/trecho.
  const fecha = titulo.indexOf(')')
  let autorAno = ''
  let obra = ''
  if (fecha > 0 && titulo.lastIndexOf('(', fecha) >= 0) {
    autorAno = titulo.slice(0, fecha + 1).trim()
    obra = titulo.slice(fecha + 1).replace(/^\s*[,.:;–—-]\s*/, '').trim()
  } else {
    motivos.push(tr('int.semAutorAno'))
  }

  // 3. Campos: cada rótulo começa um campo, que continua até o próximo rótulo.
  const brutos = new Map<Chave, string>()
  const ordemVista: Chave[] = []
  let atual: Chave | null = null
  const soltas: string[] = []
  for (const linha of linhas.slice(iTitulo + 1)) {
    const t = linha.trim()
    const r = t.match(LINHA_ROTULO)
    if (r) {
      atual = qualRotulo(r[1])
      if (brutos.has(atual)) {
        avisos.push(tr('int.repetido', { campo: nome(atual) }))
        atual = null
        continue
      }
      ordemVista.push(atual)
      brutos.set(atual, r[2].trim())
    } else if (t) {
      if (atual) brutos.set(atual, `${brutos.get(atual)} ${t}`.trim())
      else soltas.push(t)
    }
  }

  if (soltas.length) avisos.push(tr('int.solto', { texto: soltas.join(' ').slice(0, 80) }))
  const ordemCerta = ROTULOS.map((r) => r.chave).filter((c) => ordemVista.includes(c))
  if (ordemCerta.join() !== ordemVista.join()) avisos.push(tr('int.ordem'))

  const tese = valor(brutos.get('tese') ?? '')
  if (!tese) motivos.push(tr('int.semTese'))
  for (const r of ROTULOS) {
    if (r.chave !== 'tese' && !brutos.has(r.chave)) avisos.push(tr('int.falta', { campo: nome(r.chave) }))
  }

  if (motivos.length) return { ok: false, titulo, motivos }

  return {
    ok: true,
    avisos,
    campos: {
      titulo,
      autorAno,
      obra,
      ref: valor(brutos.get('ref') ?? ''),
      tese,
      conceitos: lista(brutos.get('conceitos') ?? ''),
      lembrar: valor(brutos.get('lembrar') ?? ''),
      dialogos: lista(brutos.get('dialogos') ?? ''),
      usos: lista(brutos.get('uso') ?? ''),
      video: valor(brutos.get('video') ?? ''),
      fichamento: valor(brutos.get('fichamento') ?? ''),
    },
  }
}
