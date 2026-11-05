// A mesa infinita: fichas e áreas arrastáveis, zoom e "Ver tudo", com filtro por coleção.

import { useEffect, useMemo, useRef } from 'react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { comSubcolecoes, type Biblioteca, type Ficha } from '../zotero/biblioteca.ts'
import { alterarMesa, mesa, posicionarFicha, type Area, type Posicao } from '../estado/mesa.ts'
import { LARGURA_FICHA, NoFichaMemo } from './NoFicha.tsx'
import { NoAreaMemo } from './NoArea.tsx'
import { noDeArea, type NoMesa } from './operacoes.ts'
import { VER_TUDO } from './opcoes.ts'

const tiposDeNo = { ficha: NoFichaMemo, area: NoAreaMemo }
const ESPACO = 40
const ALTURA_ESTIMADA = 420

const passa = (f: Ficha, filtro: Set<string> | null) => !filtro || f.colecoes.some((k) => filtro.has(k))
const areaPassa = (a: Area, colecao: string) => colecao === '*' || a.colecao === '*' || a.colecao === colecao

export function Mesa({ bib, colecao }: { bib: Biblioteca; colecao: string }) {
  const [nos, setNos, aoMudarNos] = useNodesState<NoMesa>([])
  const { fitView, getNodes } = useReactFlow<NoMesa>()
  const medidos = useNodesInitialized()
  /** Fichas que ainda não têm lugar na mesa e esperam ser medidas para serem arrumadas. */
  const semLugar = useRef(new Set<string>())
  /** Fichas que estão sendo levadas junto com a área arrastada (e sua distância até ela). */
  const levadas = useRef(new Map<string, Posicao>())

  const nomeColecao = useMemo(() => new Map(bib.colecoes.map((c) => [c.chave, c.nome])), [bib])
  const filtro = useMemo(() => (colecao === '*' ? null : comSubcolecoes(colecao, bib.colecoes)), [colecao, bib])
  const visiveis = bib.fichas.filter((f) => passa(f, filtro)).length

  // Fichas vindas do Zotero: mantém a posição das que já estão na mesa (nesta
  // sessão ou salvas antes); só as que nunca tiveram lugar serão arrumadas.
  useEffect(() => {
    const atuais = new Map(getNodes().map((n) => [n.id, n]))
    const areas = mesa.areas.map((a) => noDeArea(a, !areaPassa(a, colecao)))
    const fichas = bib.fichas.map((f): NoMesa => {
      const salvo = mesa.fichas[f.chave]
      const posicao = atuais.get(f.chave)?.position ?? salvo
      if (!posicao) semLugar.current.add(f.chave)
      return {
        id: f.chave,
        type: 'ficha',
        position: posicao ?? { x: 0, y: 0 },
        data: {
          ficha: f,
          colecoes: f.colecoes.map((k) => nomeColecao.get(k) ?? '?'),
          cor: salvo?.cor,
          recolhida: !!salvo?.recolhida,
          ocultos: salvo?.ocultos ?? [],
        },
        hidden: !passa(f, filtro),
      }
    })
    // Áreas primeiro: são desenhadas antes, ficando atrás das fichas.
    setNos([...areas, ...fichas])
    // O filtro é tratado no efeito abaixo; aqui só reagimos a uma nova leitura do Zotero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bib])

  // Depois de medir as fichas novas, arruma-as em colunas abaixo do que já existe.
  useEffect(() => {
    if (!medidos || semLugar.current.size === 0) return
    const todos = getNodes()
    const fixos = todos.filter((n) => !semLugar.current.has(n.id))
    const novos = todos
      .filter((n) => semLugar.current.has(n.id) && n.type === 'ficha')
      .sort((a, b) =>
        a.type === 'ficha' && b.type === 'ficha'
          ? a.data.ficha.autorAno.localeCompare(b.data.ficha.autorAno, 'pt-BR')
          : 0,
      )
    const altura = (n: NoMesa) => n.measured?.height ?? n.height ?? ALTURA_ESTIMADA
    const topo = fixos.length ? Math.max(...fixos.map((n) => n.position.y + altura(n))) + ESPACO * 2 : 0
    const colunas = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(novos.length * 1.3))))
    const base = Array<number>(colunas).fill(topo)
    const lugar = new Map<string, Posicao>()
    for (const n of novos) {
      const c = base.indexOf(Math.min(...base))
      lugar.set(n.id, { x: c * (LARGURA_FICHA + ESPACO), y: base[c] })
      base[c] += altura(n) + ESPACO
    }
    semLugar.current.clear()
    setNos((ns) => ns.map((n) => (lugar.has(n.id) ? { ...n, position: lugar.get(n.id)! } : n)))
    alterarMesa((e) => lugar.forEach((p, id) => posicionarFicha(e, id, p)))
    // Na primeira vez (sem vista salva), enquadra tudo; depois, respeita a vista guardada.
    if (!mesa.vista) requestAnimationFrame(() => fitView(VER_TUDO))
  }, [medidos, getNodes, setNos, fitView])

  // Trocar a coleção: esconde fichas e áreas de fora e enquadra o que ficou.
  // Ao abrir a mesa, não enquadra: a vista salva é que vale.
  const colecaoAnterior = useRef(colecao)
  useEffect(() => {
    setNos((ns) =>
      ns.map((n) => ({
        ...n,
        hidden: n.type === 'ficha' ? !passa(n.data.ficha, filtro) : !areaPassa(n.data.area, colecao),
      })),
    )
    if (colecaoAnterior.current === colecao) return
    colecaoAnterior.current = colecao
    const t = setTimeout(() => fitView(VER_TUDO), 60)
    return () => clearTimeout(t)
  }, [filtro, colecao, setNos, fitView])

  // Arrastar uma área leva junto as fichas visíveis cujo topo-centro está dentro dela.
  const aoComecarArrastar: OnNodeDrag<NoMesa> = (_, no) => {
    levadas.current.clear()
    if (no.type !== 'area') return
    const { x, y } = no.position
    const w = no.measured?.width ?? no.width ?? 0
    const h = no.measured?.height ?? no.height ?? 0
    for (const n of getNodes()) {
      if (n.type !== 'ficha' || n.hidden) continue
      const cx = n.position.x + (n.measured?.width ?? LARGURA_FICHA) / 2
      const cy = n.position.y + 40
      if (cx > x && cx < x + w && cy > y && cy < y + h) {
        levadas.current.set(n.id, { x: n.position.x - x, y: n.position.y - y })
      }
    }
  }
  const aoArrastar: OnNodeDrag<NoMesa> = (_, no) => {
    if (no.type !== 'area' || levadas.current.size === 0) return
    const d = levadas.current
    setNos((ns) =>
      ns.map((n) =>
        d.has(n.id) ? { ...n, position: { x: no.position.x + d.get(n.id)!.x, y: no.position.y + d.get(n.id)!.y } } : n,
      ),
    )
  }
  const aoSoltar: OnNodeDrag<NoMesa> = (_, __, arrastados) => {
    const d = levadas.current
    alterarMesa((e) => {
      for (const n of arrastados) {
        if (n.type === 'ficha') posicionarFicha(e, n.id, n.position)
        else {
          const a = e.areas.find((x) => x.id === n.data.area.id)
          if (a) {
            a.x = Math.round(n.position.x)
            a.y = Math.round(n.position.y)
          }
          d.forEach((rel, id) => posicionarFicha(e, id, { x: n.position.x + rel.x, y: n.position.y + rel.y }))
        }
      }
    })
    // Mantém a área (nos dados do nó) com a posição nova.
    setNos((ns) =>
      ns.map((n) =>
        n.type === 'area' && arrastados.some((a) => a.id === n.id)
          ? { ...n, data: { ...n.data, area: { ...n.data.area, x: Math.round(n.position.x), y: Math.round(n.position.y) } } }
          : n,
      ),
    )
    d.clear()
  }

  return (
    <div className="mesa">
      <ReactFlow
        nodes={nos}
        onNodesChange={aoMudarNos}
        nodeTypes={tiposDeNo}
        defaultViewport={mesa.vista ?? undefined}
        onNodeDragStart={aoComecarArrastar}
        onNodeDrag={aoArrastar}
        onNodeDragStop={aoSoltar}
        onMoveEnd={(_, v) =>
          alterarMesa((e) => {
            e.vista = { x: Math.round(v.x), y: Math.round(v.y), zoom: Math.round(v.zoom * 1000) / 1000 }
          })
        }
        minZoom={0.2}
        maxZoom={2.2}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        nodesConnectable={false}
        colorMode="system"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} />
      </ReactFlow>
      {visiveis === 0 && (
        <div className="mesa-vazia">
          {bib.fichas.length === 0 ? 'Ainda não há fichas no Zotero.' : 'Nenhuma ficha nesta coleção.'}
        </div>
      )}
    </div>
  )
}
