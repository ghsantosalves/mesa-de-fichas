// Interpreta o texto de uma ficha no formato da skill ficha-academica.
// Problemas impedem a ficha de ir para a mesa; avisos não.

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

/** Rótulos na ordem fixa do formato. */
const ROTULOS: { chave: Chave; nome: string; padrao: string }[] = [
  { chave: 'ref', nome: 'Ref.', padrao: 'Ref\\.?' },
  { chave: 'tese', nome: 'Tese', padrao: 'Tese' },
  { chave: 'conceitos', nome: 'Conceitos', padrao: 'Conceitos' },
  { chave: 'lembrar', nome: 'Para lembrar', padrao: 'Para lembrar' },
  { chave: 'dialogos', nome: 'Diálogos', padrao: 'Di[aá]logos' },
  { chave: 'uso', nome: 'Uso', padrao: 'Usos?' },
  { chave: 'video', nome: 'Vídeo', padrao: 'V[ií]deo' },
  { chave: 'fichamento', nome: 'Fichamento completo', padrao: 'Fichamento completo' },
]
const LINHA_ROTULO = new RegExp(`^(${ROTULOS.map((r) => r.padrao).join('|')})\\s*:\\s*(.*)$`, 'i')
const LINHA_TITULO = /^FICHA\b\s*[·•:\-–—]?\s*(.*)$/i
const VAZIO = /^[—–-]?$/

const lista = (v: string) =>
  v
    .split(/\s*·\s*/)
    .map((s) => s.trim())
    .filter((s) => !VAZIO.test(s))

const valor = (v: string) => (VAZIO.test(v.trim()) ? '' : v.trim())

function qualRotulo(nome: string): Chave {
  return ROTULOS.find((r) => new RegExp(`^${r.padrao}$`, 'i').test(nome))!.chave
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
      motivos: [primeira ? 'Não começa com “FICHA ·”.' : 'A nota está vazia.'],
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
    motivos.push('O título não tem “Autor (ano)”.')
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
        avisos.push(`O campo “${ROTULOS.find((x) => x.chave === atual)!.nome}” aparece mais de uma vez; usei a primeira.`)
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

  if (soltas.length) avisos.push(`Texto fora de qualquer campo: “${soltas.join(' ').slice(0, 80)}”.`)
  const ordemCerta = ROTULOS.map((r) => r.chave).filter((c) => ordemVista.includes(c))
  if (ordemCerta.join() !== ordemVista.join()) avisos.push('Os campos estão fora da ordem do formato.')

  const tese = valor(brutos.get('tese') ?? '')
  if (!tese) motivos.push('Falta o campo “Tese” (ou está vazio).')
  for (const r of ROTULOS) {
    if (r.chave !== 'tese' && !brutos.has(r.chave)) avisos.push(`Falta o campo “${r.nome}”.`)
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
