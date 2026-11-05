// A mesa infinita: fichas arrastáveis, zoom e "Ver tudo", com filtro por coleção.

import { useEffect, useMemo, useRef } from 'react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { comSubcolecoes, type Biblioteca, type Ficha } from '../zotero/biblioteca.ts'
import { alterarMesa, arredondar, mesa } from '../estado/mesa.ts'
import { LARGURA_FICHA, NoFichaMemo, type NoFicha } from './NoFicha.tsx'
import { VER_TUDO } from './opcoes.ts'

const tiposDeNo = { ficha: NoFichaMemo }
const ESPACO = 40
const ALTURA_ESTIMADA = 420

/** Chaves das coleções que passam no filtro (null = todas). */
function filtroColecao(colecao: string, bib: Biblioteca): Set<string> | null {
  return colecao === '*' ? null : comSubcolecoes(colecao, bib.colecoes)
}
const passa = (f: Ficha, filtro: Set<string> | null) => !filtro || f.colecoes.some((k) => filtro.has(k))

export function Mesa({ bib, colecao }: { bib: Biblioteca; colecao: string }) {
  const [nos, setNos, aoMudarNos] = useNodesState<NoFicha>([])
  const { fitView, getNodes } = useReactFlow<NoFicha>()
  const medidos = useNodesInitialized()
  /** Fichas que ainda não têm lugar na mesa e esperam ser medidas para serem arrumadas. */
  const semLugar = useRef(new Set<string>())

  const nomeColecao = useMemo(() => new Map(bib.colecoes.map((c) => [c.chave, c.nome])), [bib])
  const filtro = useMemo(() => filtroColecao(colecao, bib), [colecao, bib])
  const visiveis = bib.fichas.filter((f) => passa(f, filtro)).length

  // Fichas vindas do Zotero: mantém a posição das que já estão na mesa (nesta
  // sessão ou salvas antes); só as que nunca tiveram lugar serão arrumadas.
  useEffect(() => {
    const posicoes = new Map(getNodes().map((n) => [n.id, n.position]))
    setNos(
      bib.fichas.map((f) => {
        const posicao = posicoes.get(f.chave) ?? mesa.fichas[f.chave]
        if (!posicao) semLugar.current.add(f.chave)
        return {
          id: f.chave,
          type: 'ficha',
          position: posicao ?? { x: 0, y: 0 },
          data: { ficha: f, colecoes: f.colecoes.map((k) => nomeColecao.get(k) ?? '?') },
          hidden: !passa(f, filtro),
        }
      }),
    )
    // O filtro é tratado no efeito abaixo; aqui só reagimos a uma nova leitura do Zotero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bib])

  // Depois de medir as fichas novas, arruma-as em colunas abaixo das que já existem.
  useEffect(() => {
    if (!medidos || semLugar.current.size === 0) return
    const todos = getNodes()
    const fixos = todos.filter((n) => !semLugar.current.has(n.id))
    const novos = todos
      .filter((n) => semLugar.current.has(n.id))
      .sort((a, b) => a.data.ficha.autorAno.localeCompare(b.data.ficha.autorAno, 'pt-BR'))
    const altura = (n: NoFicha) => n.measured?.height ?? ALTURA_ESTIMADA
    const topo = fixos.length ? Math.max(...fixos.map((n) => n.position.y + altura(n))) + ESPACO * 2 : 0
    const colunas = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(novos.length * 1.3))))
    const base = Array<number>(colunas).fill(topo)
    const lugar = new Map<string, { x: number; y: number }>()
    for (const n of novos) {
      const c = base.indexOf(Math.min(...base))
      lugar.set(n.id, { x: c * (LARGURA_FICHA + ESPACO), y: base[c] })
      base[c] += altura(n) + ESPACO
    }
    semLugar.current.clear()
    setNos((ns) => ns.map((n) => (lugar.has(n.id) ? { ...n, position: lugar.get(n.id)! } : n)))
    alterarMesa((e) => lugar.forEach((p, id) => (e.fichas[id] = arredondar(p))))
    // Na primeira vez (sem vista salva), enquadra tudo; depois, respeita a vista guardada.
    if (!mesa.vista) requestAnimationFrame(() => fitView(VER_TUDO))
  }, [medidos, getNodes, setNos, fitView])

  // Trocar a coleção: esconde as fichas de fora e enquadra as que ficaram.
  // Ao abrir a mesa, não enquadra: a vista salva é que vale.
  const colecaoAnterior = useRef(colecao)
  useEffect(() => {
    setNos((ns) => ns.map((n) => ({ ...n, hidden: !passa(n.data.ficha, filtro) })))
    if (colecaoAnterior.current === colecao) return
    colecaoAnterior.current = colecao
    const t = setTimeout(() => fitView(VER_TUDO), 60)
    return () => clearTimeout(t)
  }, [filtro, colecao, setNos, fitView])

  return (
    <div className="mesa">
      <ReactFlow
        nodes={nos}
        onNodesChange={aoMudarNos}
        nodeTypes={tiposDeNo}
        defaultViewport={mesa.vista ?? undefined}
        onNodeDragStop={(_, __, arrastados) =>
          alterarMesa((e) => arrastados.forEach((n) => (e.fichas[n.id] = arredondar(n.position))))
        }
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
