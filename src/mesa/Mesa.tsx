// A mesa infinita: fichas e áreas arrastáveis, zoom e "Ver tudo", com filtro por coleção.

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useStore,
  type OnNodeDrag,
} from '@xyflow/react'
import { ArestaAssocMemo } from './ArestaAssoc.tsx'
import { arestaDe, type ArestaAssoc, type DadosAresta } from './assoc.ts'
import { acomodarMesa } from './mapa.ts'
import { CAIXA, montarRecorte } from './recorte.ts'
import '@xyflow/react/dist/style.css'
import { comSubcolecoes, type Biblioteca, type Ficha } from '../zotero/biblioteca.ts'
import {
  alterarMesa,
  associacaoNaColecao,
  lugarNaColecao,
  mesa,
  posicionarFicha,
  type Area,
  type FichaRemovida,
  type Posicao,
} from '../estado/mesa.ts'
import { LARGURA_FICHA, NoFichaMemo, type DadosFicha } from './NoFicha.tsx'
import { NoAreaMemo } from './NoArea.tsx'
import { noDeArea, type NoMesa } from './operacoes.ts'
import { VER_TUDO } from './opcoes.ts'
import { FaixaNovas, TIPO_ARRASTE } from './FaixaNovas.tsx'
import { Desenhos } from './Desenhos.tsx'
import type { Ferramenta } from './contexto.ts'
import { comparar, t } from '../i18n.ts'

const tiposDeNo = { ficha: NoFichaMemo, area: NoAreaMemo }
const tiposDeAresta = { assoc: ArestaAssocMemo }
const ESPACO = 40
const ALTURA_ESTIMADA = 420

const passa = (f: Ficha, filtro: Set<string> | null) => !filtro || f.colecoes.some((k) => filtro.has(k))
const areaPassa = (a: Area, colecao: string) => colecao === '*' || a.colecao === '*' || a.colecao === colecao

/** Ficha "de mentira" com o último conteúdo conhecido de uma ficha que sumiu do Zotero. */
function fichaRemovida(chave: string, r: FichaRemovida | undefined): Ficha {
  return {
    chave,
    versao: 0,
    chavePai: null,
    colecoes: r?.colecoes ?? [],
    titulo: r ? `${r.autorAno}${r.obra ? `, ${r.obra}` : ''}` : '',
    autorAno: r?.autorAno || t('ficha.semDados'),
    obra: r?.obra ?? '',
    ref: r?.ref ?? '',
    tese: r?.tese ?? '',
    conceitos: [],
    lembrar: '',
    dialogos: [],
    usos: [],
    video: '',
    fichamento: '',
    avisos: [],
  }
}

type Props = {
  bib: Biblioteca
  colecao: string
  ligando: boolean
  /** Ficha no centro do recorte (null = mesa normal). */
  recorte: string | null
  /** Relações escondidas pela legenda (também ficam fora do recorte). */
  ocultas: string[]
  /** Recebe os itens do recorte na ordem de caminhar (caixa, texto, caixa, texto…). */
  aoMontarRecorte: (itens: string[]) => void
  notas: boolean
  ferramenta: Ferramenta | null
  aoMudarFerramenta: (f: Ferramenta | null) => void
  aoClicarFicha: (chave: string) => void
  aoClicarFundo: () => void
}

export function Mesa({
  bib,
  colecao,
  ligando,
  recorte,
  ocultas,
  aoMontarRecorte,
  notas,
  ferramenta,
  aoMudarFerramenta,
  aoClicarFicha,
  aoClicarFundo,
}: Props) {
  const [nos, setNos, aoMudarNos] = useNodesState<NoMesa>([])
  const [arestas, setArestas, aoMudarArestas] = useEdgesState<ArestaAssoc>([])
  const { fitView, getNodes } = useReactFlow<NoMesa, ArestaAssoc>()
  const medidos = useNodesInitialized()
  /** Fichas que ainda não têm lugar na mesa e esperam ser medidas para serem arrumadas. */
  const semLugar = useRef(new Set<string>())
  /** Fichas que estão sendo levadas junto com a área arrastada (e sua distância até ela). */
  const levadas = useRef(new Map<string, Posicao>())
  /** Onde começar a arrumar as fichas colocadas pela faixa (null = abaixo de tudo). */
  const origemNovas = useRef<Posicao | null>(null)
  /** Fichas para onde levar a vista depois de arrumadas (quando não couberam na tela). */
  const enquadrarDepois = useRef<string[] | null>(null)
  /** Fichas do Zotero que ainda não estão na mesa (aparecem na faixa "Novas fichas"). */
  const [novas, setNovas] = useState<Ficha[]>([])
  const { screenToFlowPosition } = useReactFlow()

  const nomeColecao = useMemo(() => new Map(bib.colecoes.map((c) => [c.chave, c.nome])), [bib])
  const filtro = useMemo(() => (colecao === '*' ? null : comSubcolecoes(colecao, bib.colecoes)), [colecao, bib])
  const visiveis = bib.fichas.filter((f) => passa(f, filtro)).length

  const noDeFicha = useCallback(
    (f: Ficha, posicao: Posicao, extra?: Partial<DadosFicha>): NoMesa => {
      const salvo = mesa.fichas[f.chave]
      const lugar = lugarNaColecao(salvo, colecao)
      return {
        id: f.chave,
        type: 'ficha',
        position: posicao,
        data: {
          ficha: f,
          colecoes: f.colecoes.map((k) => nomeColecao.get(k) ?? '?'),
          cor: salvo?.cor,
          recolhida: !!lugar?.recolhida,
          ocultos: salvo?.ocultos ?? [],
          grifos: salvo?.grifos ?? [],
          ...extra,
        },
        hidden: !passa(f, filtro),
      }
    },
    [nomeColecao, filtro, colecao],
  )

  /**
   * Desenha as associações da coleção atual (e as gerais) cujas duas fichas estão na
   * mesa. As outras continuam guardadas.
   */
  const atualizarArestas = useCallback(() => {
    const naMesa = new Set(getNodes().map((n) => n.id))
    setArestas(
      mesa.associacoes
        .filter((a) => naMesa.has(a.a) && naMesa.has(a.b) && associacaoNaColecao(a, mesa.colecao))
        .map(arestaDe),
    )
  }, [getNodes, setArestas])

  // Fichas vindas do Zotero. Ficam na mesa as que já tinham lugar (nesta sessão ou
  // salvas antes). Na primeira vez, todas são arrumadas sozinhas; depois disso, as
  // novas esperam na faixa "Novas fichas". As que sumiram do Zotero aparecem como
  // "removidas" até o usuário decidir tirá-las.
  useEffect(() => {
    const atuais = new Map(getNodes().map((n) => [n.id, n]))
    const primeiraVez = Object.keys(mesa.fichas).length === 0 && atuais.size === 0
    const areas = mesa.areas.map((a) => noDeArea(a, !areaPassa(a, colecao)))
    const naMesa: NoMesa[] = []
    const foraDaMesa: Ficha[] = []
    for (const f of bib.fichas) {
      const lugar = lugarNaColecao(mesa.fichas[f.chave], colecao)
      const posicao = atuais.get(f.chave)?.position ?? (lugar && { x: lugar.x, y: lugar.y })
      if (posicao) naMesa.push(noDeFicha(f, posicao))
      else if (primeiraVez) {
        semLugar.current.add(f.chave)
        naMesa.push(noDeFicha(f, { x: 0, y: 0 }))
      } else foraDaMesa.push(f)
    }
    // Fichas com lugar na mesa que não existem mais no Zotero (nem como "com problema").
    const noZotero = new Set([...bib.fichas, ...bib.problemas].map((f) => f.chave))
    for (const [chave, salvo] of Object.entries(mesa.fichas)) {
      if (noZotero.has(chave)) continue
      const p = lugarNaColecao(salvo, colecao)!
      const r = mesa.removidas[chave]
      const associacoes = mesa.associacoes.filter((a) => a.a === chave || a.b === chave).length
      naMesa.push(noDeFicha(fichaRemovida(chave, r), { x: p.x, y: p.y }, { removida: { em: r?.em ?? '', associacoes } }))
    }
    // Áreas primeiro: são desenhadas antes, ficando atrás das fichas.
    setNos([...areas, ...naMesa])
    setNovas(foraDaMesa)
    requestAnimationFrame(atualizarArestas)
    // O filtro é tratado no efeito abaixo; aqui só reagimos a uma nova leitura do Zotero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bib])

  // Depois de medir as fichas sem lugar, arruma-as em colunas (abaixo do que já
  // existe, ou a partir do ponto escolhido ao colocá-las pela faixa).
  useEffect(() => {
    if (!medidos || semLugar.current.size === 0) return
    const todos = getNodes()
    const fixos = todos.filter((n) => !semLugar.current.has(n.id))
    const novos = todos
      .filter((n) => semLugar.current.has(n.id) && n.type === 'ficha')
      .sort((a, b) =>
        a.type === 'ficha' && b.type === 'ficha'
          ? comparar(a.data.ficha.autorAno, b.data.ficha.autorAno)
          : 0,
      )
    const altura = (n: NoMesa) => n.measured?.height ?? n.height ?? ALTURA_ESTIMADA
    const origem = origemNovas.current ?? {
      x: 0,
      y: fixos.length ? Math.max(...fixos.map((n) => n.position.y + altura(n))) + ESPACO * 2 : 0,
    }
    const colunas = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(novos.length * 1.3))))
    const base = Array<number>(colunas).fill(origem.y)
    const lugar = new Map<string, Posicao>()
    for (const n of novos) {
      const c = base.indexOf(Math.min(...base))
      lugar.set(n.id, { x: origem.x + c * (LARGURA_FICHA + ESPACO), y: base[c] })
      base[c] += altura(n) + ESPACO
    }
    const primeiraArrumacao = !origemNovas.current
    semLugar.current.clear()
    origemNovas.current = null
    setNos((ns) => ns.map((n) => (lugar.has(n.id) ? { ...n, position: lugar.get(n.id)! } : n)))
    alterarMesa((e) => lugar.forEach((p, id) => posicionarFicha(e, id, p)))
    // Na primeira vez (sem vista salva), enquadra tudo; depois, respeita a vista guardada.
    const ir = enquadrarDepois.current
    enquadrarDepois.current = null
    if (ir) requestAnimationFrame(() => fitView({ nodes: ir.map((id) => ({ id })), padding: 0.3, maxZoom: 1, duration: 300 }))
    else if (primeiraArrumacao && !mesa.vista) requestAnimationFrame(() => fitView(VER_TUDO))
  }, [medidos, getNodes, setNos, fitView])

  /**
   * Procura, na parte visível da mesa, um espaço vazio para `n` fichas (em colunas).
   * Se não houver, devolve null: elas vão para baixo de tudo.
   */
  const lugarLivre = (n: number): Posicao | null => {
    const tela = document.querySelector('.mesa .react-flow')?.getBoundingClientRect()
    if (!tela) return null
    const a = screenToFlowPosition({ x: tela.left, y: tela.top })
    const b = screenToFlowPosition({ x: tela.right, y: tela.bottom })
    const colunas = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(n * 1.3))))
    const larg = colunas * (LARGURA_FICHA + ESPACO)
    const alt = Math.min(ALTURA_ESTIMADA * Math.ceil(n / colunas), Math.max(ALTURA_ESTIMADA, b.y - a.y - 80))
    const ocupados = getNodes()
      .filter((no) => !no.hidden && no.type === 'ficha')
      .map((no) => ({
        x: no.position.x,
        y: no.position.y,
        w: no.measured?.width ?? LARGURA_FICHA,
        h: no.measured?.height ?? ALTURA_ESTIMADA,
      }))
    const livre = (x: number, y: number) =>
      ocupados.every((r) => x + larg <= r.x - 10 || x >= r.x + r.w + 10 || y + alt <= r.y - 10 || y >= r.y + r.h + 10)
    const passo = (LARGURA_FICHA + ESPACO) / 2
    for (let y = a.y + 40; y + 120 <= b.y; y += passo) {
      for (let x = a.x + 40; x + larg <= b.x + 1; x += passo) {
        if (livre(x, y)) return { x: Math.round(x), y: Math.round(y) }
      }
    }
    return null
  }

  /** Põe fichas da faixa na mesa: num ponto (ao soltar) ou num espaço vazio da parte visível. */
  const colocar = (fichas: Ficha[], ponto?: Posicao) => {
    if (!fichas.length) return
    const chaves = new Set(fichas.map((f) => f.chave))
    if (ponto) {
      setNos((ns) => [...ns, ...fichas.map((f) => noDeFicha(f, ponto))])
      alterarMesa((e) => fichas.forEach((f) => posicionarFicha(e, f.chave, ponto)))
    } else {
      origemNovas.current = lugarLivre(fichas.length)
      // Sem espaço visível: vão para baixo de tudo, e a vista vai até elas.
      if (!origemNovas.current) enquadrarDepois.current = [...chaves]
      fichas.forEach((f) => semLugar.current.add(f.chave))
      setNos((ns) => [...ns, ...fichas.map((f) => noDeFicha(f, { x: 0, y: 0 }))])
    }
    setNovas((ns) => ns.filter((f) => !chaves.has(f.chave)))
    requestAnimationFrame(atualizarArestas)
  }
  const aoPassarArrastando = (e: DragEvent) => {
    if (e.dataTransfer.types.includes(TIPO_ARRASTE)) e.preventDefault()
  }
  const aoSoltarDaFaixa = (e: DragEvent) => {
    const chave = e.dataTransfer.getData(TIPO_ARRASTE)
    const f = novas.find((x) => x.chave === chave)
    if (!f) return
    e.preventDefault()
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    colocar([f], { x: Math.round(p.x - LARGURA_FICHA / 2), y: Math.round(p.y - 20) })
  }

  // Trocar a coleção: esconde fichas e áreas de fora, põe as fichas na arrumação
  // própria da coleção, troca as associações e enquadra o que ficou.
  // Ao abrir a mesa, não enquadra: a vista salva é que vale.
  const colecaoAnterior = useRef(colecao)
  useEffect(() => {
    const trocou = colecaoAnterior.current !== colecao
    setNos((ns) =>
      ns.map((n) => {
        if (n.type !== 'ficha') return { ...n, hidden: !areaPassa(n.data.area, colecao) }
        const lugar = trocou ? lugarNaColecao(mesa.fichas[n.id], colecao) : undefined
        return {
          ...n,
          hidden: !passa(n.data.ficha, filtro),
          ...(lugar && { position: { x: lugar.x, y: lugar.y }, data: { ...n.data, recolhida: lugar.recolhida } }),
        }
      }),
    )
    if (!trocou) return
    colecaoAnterior.current = colecao
    requestAnimationFrame(atualizarArestas)
    const t = setTimeout(() => fitView(VER_TUDO), 60)
    return () => clearTimeout(t)
  }, [filtro, colecao, setNos, fitView, atualizarArestas])

  // Reajuste automático: quando muda o tamanho de alguma ficha visível (ao expandir,
  // ao abrir a mesa, ao trocar de coleção) ou o texto das caixas das associações,
  // afasta o que estiver encostando. As fichas que mudaram de tamanho ficam paradas.
  const rf = useReactFlow<NoMesa>()
  const tamanhos = useStore((s) => {
    const fichas = s.nodes.filter((n) => n.type === 'ficha' && !n.hidden)
    if (fichas.some((n) => !n.measured?.width)) return ''
    return fichas.map((n) => `${n.id}=${Math.round(n.measured!.width!)}x${Math.round(n.measured!.height ?? 0)}`).join('|')
  })
  const textoCaixas = useStore((s) =>
    s.edges
      .map((e) => {
        const a = (e.data as DadosAresta | undefined)?.assoc
        return a ? `${a.id}:${a.rel.length}:${a.nota.length}:${a.w ?? ''}:${a.h ?? ''}` : ''
      })
      .join('|'),
  )
  const tamanhosAntes = useRef(new Map<string, string>())
  useEffect(() => {
    // No recorte, nada é reajustado nem salvo.
    if (!tamanhos || recorteAtual.current) return
    const agora = new Map(tamanhos.split('|').map((x) => x.split('=') as [string, string]))
    const fixas = [...agora]
      .filter(([id, tam]) => tamanhosAntes.current.has(id) && tamanhosAntes.current.get(id) !== tam)
      .map(([id]) => id)
    tamanhosAntes.current = agora
    const espera = setTimeout(() => acomodarMesa(rf, fixas), 200)
    return () => clearTimeout(espera)
  }, [tamanhos, textoCaixas, notas, rf])

  // Recorte: monta a vista com o texto do centro e os ligados a ele; ao sair, devolve
  // cada ficha (e a vista) ao lugar de antes. Nada disso é salvo.
  const recorteAtual = useRef<string | null>(null)
  const vistaAntes = useRef<{ x: number; y: number; zoom: number } | null>(null)
  useEffect(() => {
    recorteAtual.current = recorte
    if (recorte) {
      vistaAntes.current ??= rf.getViewport()
      const naMesa = (id: string) => {
        const n = rf.getNode(id)
        return n?.type === 'ficha' && passa(n.data.ficha, filtro)
      }
      const itens = montarRecorte(rf, recorte, ocultas, naMesa)
      aoMontarRecorte(itens)
      const fichas = [recorte, ...itens.filter((i) => !i.startsWith(CAIXA))]
      const espera = setTimeout(() => fitView({ nodes: fichas.map((id) => ({ id })), padding: 0.25, maxZoom: 1, duration: 300 }), 80)
      return () => clearTimeout(espera)
    }
    if (!vistaAntes.current) return
    const vista = vistaAntes.current
    vistaAntes.current = null
    aoMontarRecorte([])
    setNos((ns) =>
      ns.map((n) => {
        if (n.type !== 'ficha') return { ...n, hidden: !areaPassa(n.data.area, colecao) }
        const lugar = lugarNaColecao(mesa.fichas[n.id], colecao)
        return { ...n, hidden: !passa(n.data.ficha, filtro), ...(lugar && { position: { x: lugar.x, y: lugar.y } }) }
      }),
    )
    rf.setViewport(vista, { duration: 300 })
    // Só reage à entrada, à troca de centro, à saída do recorte e à legenda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorte, ocultas])

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
    // No recorte, mover fichas não muda a arrumação salva.
    if (recorteAtual.current) return
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
    <div
      className={`mesa${ligando ? ' ligando' : ''}${notas ? '' : ' sem-notas'}${ferramenta === 'grifar' ? ' grifando' : ''}${recorte ? ' em-recorte' : ''}`}
      onDragOver={aoPassarArrastando}
      onDrop={aoSoltarDaFaixa}
    >
      <ReactFlow
        nodes={nos}
        edges={arestas}
        onNodesChange={aoMudarNos}
        onEdgesChange={aoMudarArestas}
        nodeTypes={tiposDeNo}
        edgeTypes={tiposDeAresta}
        onNodeClick={(e, no) => {
          // Cliques nos botões e links de dentro da ficha não contam.
          if ((e.target as HTMLElement).closest('button, a, input, label')) return
          if (no.type === 'ficha') aoClicarFicha(no.id)
        }}
        onPaneClick={aoClicarFundo}
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
        // As setas do teclado servem para caminhar no recorte, não para mover fichas.
        disableKeyboardA11y
        nodesConnectable={false}
        // Ao grifar texto, as fichas não se arrastam (o mouse seleciona o texto).
        nodesDraggable={ferramenta !== 'grifar'}
        colorMode="system"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} />
        <Desenhos ferramenta={ferramenta} aoMudarFerramenta={aoMudarFerramenta} colecao={colecao} />
      </ReactFlow>
      {visiveis === 0 && (
        <div className="mesa-vazia">
          {bib.fichas.length === 0 ? t('mesa.semFichas') : t('mesa.semFichasColecao')}
        </div>
      )}
      {novas.length > 0 && (
        <FaixaNovas
          novas={novas.filter((f) => passa(f, filtro))}
          emOutrasColecoes={novas.filter((f) => !passa(f, filtro)).length}
          aoColocar={colocar}
        />
      )}
    </div>
  )
}
