// Caneta, marcador, borracha e grifo de texto na mesa.
//
// Os traços ficam em coordenadas da mesa e são desenhados dentro da vista do
// React Flow (acompanham o arrastar e o zoom). Enquanto uma ferramenta de traço
// está ativa, uma camada transparente por cima da mesa recebe o mouse.

import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { ViewportPortal, useReactFlow } from '@xyflow/react'
import { Eraser, Highlighter, PenLine, TextSelect, Undo2, X } from 'lucide-react'
import { alterarMesa, mesa, type CampoGrifo, type Grifo, type Traco } from '../estado/mesa.ts'
import { CORES_CANETA, CORES_MARCADOR, type Ferramenta } from './contexto.ts'
import { mudarFichas, type NoMesa } from './operacoes.ts'
import { t, type Chave } from '../i18n.ts'

/** Espessuras para escolher (fina, média, grossa); a do meio é a padrão. */
const ESPESSURAS = { caneta: [1.5, 3, 6], marcador: [10, 18, 30] }
const LARGURA = { caneta: ESPESSURAS.caneta[1], marcador: ESPESSURAS.marcador[1] }
const OPACIDADE = { caneta: 1, marcador: 0.4 }
const NOMES_ESPESSURA: Chave[] = ['des.fina', 'des.media', 'des.grossa']
const larguraDe = (t: Traco) => t.largura ?? LARGURA[t.tipo]

const caminho = (p: number[]) => {
  let d = `M${p[0]},${p[1]}`
  for (let i = 2; i < p.length; i += 2) d += ` L${p[i]},${p[i + 1]}`
  return d
}

/** Distância do ponto (x, y) ao segmento (a, b). */
function distancia(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const t = dx || dy ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
}

/** Os segmentos (a, b) e (c, d) se cruzam? */
function cruzam(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const lado = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
    Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px))
  return (
    lado(ax, ay, bx, by, cx, cy) * lado(ax, ay, bx, by, dx, dy) < 0 &&
    lado(cx, cy, dx, dy, ax, ay) * lado(cx, cy, dx, dy, bx, by) < 0
  )
}

/** Distância entre os segmentos (a, b) e (c, d). */
function distanciaSegmentos(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  if (cruzam(ax, ay, bx, by, cx, cy, dx, dy)) return 0
  return Math.min(
    distancia(ax, ay, cx, cy, dx, dy),
    distancia(bx, by, cx, cy, dx, dy),
    distancia(cx, cy, ax, ay, bx, by),
    distancia(dx, dy, ax, ay, bx, by),
  )
}

/** A borracha, indo de (x0, y0) a (x1, y1), passou perto do traço? */
function tocou(t: Traco, x0: number, y0: number, x1: number, y1: number, raio: number) {
  const r = raio + larguraDe(t) / 2
  for (let i = 0; i + 3 < t.pontos.length; i += 2) {
    if (distanciaSegmentos(x0, y0, x1, y1, t.pontos[i], t.pontos[i + 1], t.pontos[i + 2], t.pontos[i + 3]) <= r) return true
  }
  return false
}

const tracoPassa = (t: Traco, colecao: string) => colecao === '*' || t.colecao === '*' || t.colecao === colecao

type Props = {
  ferramenta: Ferramenta | null
  aoMudarFerramenta: (f: Ferramenta | null) => void
  colecao: string
}

export function Desenhos({ ferramenta, aoMudarFerramenta, colecao }: Props) {
  const rf = useReactFlow<NoMesa>()
  const [tracos, setTracos] = useState<Traco[]>(() => mesa.desenhos)
  const [atual, setAtual] = useState<number[] | null>(null)
  const [corCaneta, setCorCaneta] = useState(CORES_CANETA[0])
  const [corMarcador, setCorMarcador] = useState(CORES_MARCADOR[0])
  const [espessura, setEspessura] = useState({ caneta: LARGURA.caneta, marcador: LARGURA.marcador })
  /** O que pode ser desfeito, do mais antigo ao mais recente. */
  const historico = useRef<({ tipo: 'traco'; id: string } | { tipo: 'apagados'; tracos: Traco[] })[]>([])
  const desenhando = useRef(false)

  const salvar = (novos: Traco[]) => {
    setTracos(novos)
    alterarMesa((e) => {
      e.desenhos = novos
    })
  }

  const pontoNaMesa = (e: { clientX: number; clientY: number }) => {
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]
  }

  /** Último ponto por onde a borracha passou (para apagar o caminho inteiro, não só os pontos). */
  const ultimoBorracha = useRef<number[] | null>(null)
  const apagarEm = (e: { clientX: number; clientY: number }) => {
    const [x, y] = pontoNaMesa(e)
    const [x0, y0] = ultimoBorracha.current ?? [x, y]
    ultimoBorracha.current = [x, y]
    const raio = 8 / rf.getZoom()
    const apagados = tracos.filter((t) => tracoPassa(t, colecao) && tocou(t, x0, y0, x, y, raio))
    if (!apagados.length) return
    historico.current.push({ tipo: 'apagados', tracos: apagados })
    salvar(tracos.filter((t) => !apagados.includes(t)))
  }

  const aoApertar = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    desenhando.current = true
    ultimoBorracha.current = null
    if (ferramenta === 'borracha') apagarEm(e)
    else setAtual(pontoNaMesa(e))
  }
  const aoMover = (e: PointerEvent<HTMLDivElement>) => {
    if (!desenhando.current) return
    if (ferramenta === 'borracha') return apagarEm(e)
    const [x, y] = pontoNaMesa(e)
    setAtual((p) => {
      if (!p) return [x, y]
      const minimo = 1.5 / rf.getZoom()
      if (Math.hypot(x - p[p.length - 2], y - p[p.length - 1]) < minimo) return p
      return [...p, x, y]
    })
  }
  const aoSoltar = () => {
    desenhando.current = false
    if (!atual || (ferramenta !== 'caneta' && ferramenta !== 'marcador')) return setAtual(null)
    // Um clique sem arrastar vira um ponto.
    const pontos = atual.length === 2 ? [...atual, atual[0] + 0.1, atual[1]] : atual
    const t: Traco = {
      id: crypto.randomUUID().slice(0, 8),
      tipo: ferramenta,
      cor: ferramenta === 'caneta' ? corCaneta : corMarcador,
      largura: espessura[ferramenta],
      pontos,
      colecao,
    }
    historico.current.push({ tipo: 'traco', id: t.id })
    salvar([...tracos, t])
    setAtual(null)
  }

  // A roda do mouse continua andando pela mesa (e Ctrl + roda dá zoom) com a ferramenta ativa.
  const aoRolar = (e: WheelEvent<HTMLDivElement>) => {
    const v = rf.getViewport()
    if (e.ctrlKey || e.metaKey) {
      const z = Math.min(2.2, Math.max(0.2, v.zoom * Math.exp(-e.deltaY * 0.01)))
      const caixa = e.currentTarget.getBoundingClientRect()
      const px = e.clientX - caixa.left
      const py = e.clientY - caixa.top
      rf.setViewport({ x: px - ((px - v.x) * z) / v.zoom, y: py - ((py - v.y) * z) / v.zoom, zoom: z })
    } else rf.setViewport({ x: v.x - e.deltaX, y: v.y - e.deltaY, zoom: v.zoom })
  }

  const desfazer = () => {
    const ultimo = historico.current.pop()
    if (!ultimo) return
    if (ultimo.tipo === 'traco') salvar(tracos.filter((t) => t.id !== ultimo.id))
    else salvar([...tracos, ...ultimo.tracos])
  }

  // Grifar texto: ao terminar de selecionar um trecho dentro de um campo de uma
  // ficha, o trecho fica grifado com a cor do marcador.
  useEffect(() => {
    if (ferramenta !== 'grifar') return
    const aoSoltarSelecao = () => {
      const sel = getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) return
      const r = sel.getRangeAt(0)
      const elemento = (n: Node) => (n instanceof Element ? n : n.parentElement)
      const campoEl = elemento(r.startContainer)?.closest<HTMLElement>('[data-campo]')
      const noEl = campoEl?.closest<HTMLElement>('.react-flow__node')
      if (!campoEl || !noEl || !campoEl.contains(r.endContainer)) return
      const antes = document.createRange()
      antes.selectNodeContents(campoEl)
      antes.setEnd(r.startContainer, r.startOffset)
      const inicio = antes.toString().length
      const trecho = r.toString()
      sel.removeAllRanges()
      if (!trecho.trim()) return
      const id = noEl.dataset.id!
      const no = rf.getNode(id)
      if (!no || no.type !== 'ficha') return
      const campo = campoEl.dataset.campo as CampoGrifo
      const novo: Grifo = { campo, inicio, fim: inicio + trecho.length, trecho, cor: corMarcador }
      // Um grifo novo por cima de outro do mesmo campo substitui o antigo.
      const grifos = (no.data.grifos ?? []).filter((g) => g.campo !== campo || g.fim <= novo.inicio || g.inicio >= novo.fim)
      mudarFichas(rf, [id], { grifos: [...grifos, novo] })
    }
    document.addEventListener('mouseup', aoSoltarSelecao)
    return () => document.removeEventListener('mouseup', aoSoltarSelecao)
  }, [ferramenta, corMarcador, rf])

  // Ctrl+Z desfaz o último traço (fora de campos de texto).
  useEffect(() => {
    if (!ferramenta) return
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !(e.target as HTMLElement).closest('input, textarea')) {
        e.preventDefault()
        desfazer()
      }
    }
    addEventListener('keydown', tecla)
    return () => removeEventListener('keydown', tecla)
  })

  const visiveis = tracos.filter((t) => tracoPassa(t, colecao))
  const cores = ferramenta === 'caneta' ? CORES_CANETA : CORES_MARCADOR
  const corAtiva = ferramenta === 'caneta' ? corCaneta : corMarcador
  const tipoAtual = ferramenta === 'caneta' || ferramenta === 'marcador' ? ferramenta : null

  return (
    <>
      <ViewportPortal>
        <svg className="desenhos" width="1" height="1" style={{ overflow: 'visible', position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
          {visiveis.map((t) => (
            <path
              key={t.id}
              d={caminho(t.pontos)}
              fill="none"
              stroke={t.cor}
              strokeWidth={larguraDe(t)}
              strokeOpacity={OPACIDADE[t.tipo]}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {atual && tipoAtual && (
            <path
              d={caminho(atual.length === 2 ? [...atual, atual[0] + 0.1, atual[1]] : atual)}
              fill="none"
              stroke={corAtiva}
              strokeWidth={espessura[tipoAtual]}
              strokeOpacity={OPACIDADE[tipoAtual]}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </ViewportPortal>

      {(ferramenta === 'caneta' || ferramenta === 'marcador' || ferramenta === 'borracha') && (
        <div
          className={`camada-desenho ${ferramenta}`}
          onPointerDown={aoApertar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          onWheel={aoRolar}
        />
      )}

      {ferramenta && (
        <div className="barra-desenho" role="toolbar" aria-label={t('des.barra')}>
          {(
            [
              ['caneta', 'des.caneta', PenLine],
              ['marcador', 'des.marcador', Highlighter],
              ['grifar', 'des.grifar', TextSelect],
              ['borracha', 'des.borracha', Eraser],
            ] as [Ferramenta, Chave, typeof PenLine][]
          ).map(([f, nome, Icone]) => (
            <button key={f} className="btn com-icone" aria-pressed={ferramenta === f} onClick={() => aoMudarFerramenta(f)}>
              <Icone size={16} aria-hidden="true" />
              {t(nome)}
            </button>
          ))}
          {ferramenta !== 'borracha' && (
            <span className="bd-cores" role="group" aria-label={t('des.cor')}>
              {cores.map((c) => (
                <button
                  key={c}
                  className={`bd-cor${c === corAtiva ? ' ativa' : ''}`}
                  style={{ background: c }}
                  aria-label={t('des.corN', { c })}
                  onClick={() => (ferramenta === 'caneta' ? setCorCaneta(c) : setCorMarcador(c))}
                />
              ))}
            </span>
          )}
          {tipoAtual && (
            <span className="bd-espessuras" role="group" aria-label={t('des.espessura')}>
              {ESPESSURAS[tipoAtual].map((w, i) => (
                <button
                  key={w}
                  className={`bd-espessura${espessura[tipoAtual] === w ? ' ativa' : ''}`}
                  aria-label={t('des.espessuraN', { e: t(NOMES_ESPESSURA[i]) })}
                  title={t('des.espessuraN', { e: t(NOMES_ESPESSURA[i]) })}
                  onClick={() => setEspessura({ ...espessura, [tipoAtual]: w })}
                >
                  {/* Amostra do traço, do tamanho relativo da espessura. */}
                  <span
                    style={{
                      height: Math.max(2, Math.round(w * (tipoAtual === 'caneta' ? 1.6 : 0.45))),
                      background: corAtiva,
                      opacity: OPACIDADE[tipoAtual] === 1 ? 1 : 0.6,
                    }}
                  />
                </button>
              ))}
            </span>
          )}
          <button className="btn com-icone" onClick={desfazer} title={t('des.desfazerDica')}>
            <Undo2 size={16} aria-hidden="true" />
            {t('des.desfazer')}
          </button>
          <button className="btn icone" onClick={() => aoMudarFerramenta(null)} aria-label={t('des.parar')} title={t('des.pararDica')}>
            <X size={16} aria-hidden="true" />
          </button>
          {ferramenta === 'grifar' && <span className="bd-dica">{t('des.dicaGrifar')}</span>}
        </div>
      )}
    </>
  )
}
