import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlowProvider, useReactFlow, useStore } from '@xyflow/react'
import { FilePlus2, Pencil } from 'lucide-react'
import { NOME_APP, idioma, mudarIdioma, t, tn } from './i18n.ts'
import {
  carregarBiblioteca,
  comSubcolecoes,
  esquecerCopiaZotero,
  type Biblioteca,
  type Colecao,
} from './zotero/biblioteca.ts'
import { ErroAcesso } from './zotero/api.ts'
import { esquecerCredenciais, lerCredenciais, MODO_LOCAL } from './zotero/credenciais.ts'
import { Conectar } from './Conectar.tsx'
import { Listagem } from './Listagem.tsx'
import { Mesa } from './mesa/Mesa.tsx'
import { BarraZoom } from './mesa/BarraZoom.tsx'
import { BarraMesa } from './mesa/BarraMesa.tsx'
import { PainelAssoc } from './mesa/PainelAssoc.tsx'
import { criarAssociacao, type ArestaAssoc, type DadosAresta } from './mesa/assoc.ts'
import { Legenda } from './mesa/Legenda.tsx'
import { chaveRelacao } from './mesa/relacoes.ts'
import { CAIXA } from './mesa/recorte.ts'
import { Contexto, normalizar, type ContextoMesa, type Ferramenta } from './mesa/contexto.ts'
import type { NoMesa } from './mesa/operacoes.ts'
import { alterarMesa, associacaoNaColecao, mesa, useSituacao, type Tema } from './estado/mesa.ts'
import { aoMudarSistema, aplicarTema } from './tema.ts'
import { DialogoTema } from './dialogos/DialogoTema.tsx'
import { DialogoExportar } from './dialogos/DialogoExportar.tsx'
import { DialogoArquivo } from './dialogos/DialogoArquivo.tsx'
import { DialogoImportar } from './dialogos/DialogoImportar.tsx'
import { DialogoNovaFicha } from './dialogos/DialogoNovaFicha.tsx'

// Aplica o tema salvo antes de desenhar qualquer coisa.
aplicarTema(mesa.tema)

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; motivo: string }
  | { tipo: 'pronto'; bib: Biblioteca }

/** Depois de quanto tempo, ao voltar para a aba, o app confere de novo o Zotero. */
const INTERVALO_SINCRONIA_MS = 20_000

function App() {
  return (
    <ReactFlowProvider>
      <Interior />
    </ReactFlowProvider>
  )
}

function Interior() {
  const rf = useReactFlow<NoMesa, ArestaAssoc>()
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const [conectado, setConectado] = useState(() => !!lerCredenciais())
  const [motivoConexao, setMotivoConexao] = useState<string | null>(null)
  const [pedido, setPedido] = useState({ n: 0, completa: false })
  const [modo, setModo] = useState<'mesa' | 'lista'>('mesa')
  const [colecao, setColecao] = useState(mesa.colecao)
  /** Associação aberta no painel. */
  const [ativa, setAtiva] = useState<string | null>(null)
  /** Texto no centro e o caminho feito até ele (para voltar). null = fora do recorte. */
  const [recorte, setRecorte] = useState<{ centro: string; caminho: string[] } | null>(null)
  const ultimaLeitura = useRef(0)
  const anunciadas = useRef(new Set<string>())
  const recarregar = useCallback((completa = false) => setPedido((p) => ({ n: p.n + 1, completa })), [])
  const escolherColecao = useCallback((c: string) => {
    setColecao(c)
    // Trocar de coleção fecha o painel da associação e sai do recorte.
    setAtiva(null)
    setRecorte(null)
    if (mesa.colecao !== c) alterarMesa((e) => (e.colecao = c))
  }, [])

  const [aviso, setAviso] = useState<string | null>(null)
  const tempoAviso = useRef<ReturnType<typeof setTimeout>>(undefined)
  const avisar = useCallback((texto: string, ms = 2600) => {
    setAviso(texto)
    clearTimeout(tempoAviso.current)
    tempoAviso.current = setTimeout(() => setAviso(null), ms)
  }, [])

  useEffect(() => {
    if (!conectado) return
    // Se outra leitura começar antes desta acabar, o resultado desta é ignorado.
    const leitura = { valida: true }
    carregarBiblioteca(pedido.completa)
      .then((bib) => {
        if (!leitura.valida) return
        ultimaLeitura.current = Date.now()
        const mudancas = registrarMudancas(bib)
        // Avisa cada ficha nova uma vez só (a conferência se repete ao voltar para a aba).
        const novas = mudancas.novas.filter((k) => !anunciadas.current.has(k)).length
        mudancas.novas.forEach((k) => anunciadas.current.add(k))
        const sumiram = mudancas.sumiram
        setEstado({ tipo: 'pronto', bib })
        // Se a coleção escolhida sumiu do Zotero, volta para "todas".
        if (mesa.colecao !== '*' && !bib.colecoes.some((x) => x.chave === mesa.colecao)) escolherColecao('*')
        const partes = []
        if (novas) partes.push(tn('aviso.novas', novas))
        if (sumiram) partes.push(tn('aviso.sumiram', sumiram))
        if (partes.length) avisar(partes.join(' · '), 5000)
      })
      .catch((e: unknown) => {
        if (!leitura.valida) return
        const motivo = e instanceof Error ? e.message : String(e)
        if (e instanceof ErroAcesso && !MODO_LOCAL) {
          setMotivoConexao(motivo)
          setConectado(false)
        } else setEstado({ tipo: 'erro', motivo })
      })
    return () => {
      leitura.valida = false
    }
  }, [pedido, conectado, escolherColecao, avisar])

  // Ao voltar para esta aba (por exemplo, depois de criar fichas no Zotero),
  // confere se há novidades. Só baixa o que mudou.
  useEffect(() => {
    const conferir = () => {
      if (document.visibilityState !== 'visible' || !conectado) return
      if (Date.now() - ultimaLeitura.current > INTERVALO_SINCRONIA_MS) recarregar()
    }
    addEventListener('focus', conferir)
    document.addEventListener('visibilitychange', conferir)
    return () => {
      removeEventListener('focus', conferir)
      document.removeEventListener('visibilitychange', conferir)
    }
  }, [conectado, recarregar])

  const desconectar = () => {
    if (!confirm(t('menu.confirmaDesconectar'))) return
    esquecerCredenciais()
    esquecerCopiaZotero()
    setMotivoConexao(null)
    setConectado(false)
  }

  const bib = estado.tipo === 'pronto' ? estado.bib : null

  // --- Tema, busca e janelas ---
  const [tema, setTema] = useState<Tema>(mesa.tema)
  const [busca, setBusca] = useState('')
  const [janela, setJanela] = useState<'tema' | 'exportar' | 'arquivo' | 'importar' | 'nova' | null>(null)
  const mudarTema = (t: Tema) => {
    setTema(t)
    aplicarTema(t)
    alterarMesa((e) => (e.tema = t))
  }
  // No modo "Igual ao sistema", acompanha a troca de claro/escuro do computador.
  useEffect(() => aoMudarSistema(() => aplicarTema(mesa.tema)), [])

  // --- Associações ---
  const [ligando, setLigando] = useState(false)
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const [focarRelacao, setFocarRelacao] = useState(false)
  const [notas, setNotas] = useState(mesa.notas)
  const abrirAssoc = useCallback((id: string, focar = false) => {
    setAtiva(id)
    setFocarRelacao(focar)
  }, [])
  const fecharAssoc = useCallback(() => setAtiva(null), [])
  // --- Foco e legenda das relações ---
  const [foco, setFoco] = useState<string | null>(null)
  const [ocultas, setOcultas] = useState<string[]>([])

  // --- Recorte: um texto no centro e os ligados a ele em volta; caminhar pelas relações ---
  /** Itens do recorte na ordem de caminhar: caixa, texto, caixa, texto… */
  const [itensRecorte, setItensRecorte] = useState<string[]>([])
  const [marcado, setMarcado] = useState<string | null>(null)
  const entrarNoRecorte = (centro: string) => {
    setRecorte({ centro, caminho: [] })
    setMarcado(null)
    setFoco(centro)
  }
  const irPara = (centro: string) => {
    setRecorte((r) => (r && r.centro !== centro ? { centro, caminho: [...r.caminho, r.centro] } : r))
    setMarcado(null)
    setFoco(centro)
  }
  const voltarNoRecorte = () => {
    if (!recorte?.caminho.length) return
    const anterior = recorte.caminho[recorte.caminho.length - 1]
    setRecorte({ centro: anterior, caminho: recorte.caminho.slice(0, -1) })
    setMarcado(null)
    setFoco(anterior)
  }
  const sairDoRecorte = () => {
    setRecorte(null)
    setMarcado(null)
  }
  /** Leva a vista até o item marcado (ficha ou caixa da associação), para ler. */
  /** Centro de um item do recorte (ficha ou caixa), nas coordenadas da mesa. */
  const posicaoDoItem = (item: string): { x: number; y: number } | null => {
    if (item.startsWith(CAIXA)) {
      const el = document.querySelector(`.assoc[data-assoc="${item.slice(CAIXA.length)}"]`)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    const n = rf.getNode(item)
    if (!n) return null
    return { x: n.position.x + (n.measured?.width ?? 300) / 2, y: n.position.y + (n.measured?.height ?? 200) / 2 }
  }
  const mostrarItem = (item: string) => {
    const p = posicaoDoItem(item)
    if (p) rf.setCenter(p.x, p.y, { zoom: Math.max(rf.getZoom(), 0.9), duration: 350 })
  }
  /**
   * Próximo item na direção da seta apertada (dx, dy), a partir do item marcado (ou
   * do texto do centro): o mais perto que esteja mais ou menos naquela direção.
   * Assim ↓ desce pela seta até a caixa e depois até o texto, e ↑ volta ao centro.
   */
  const itemNaDirecao = (atual: string, candidatos: string[], dx: number, dy: number): string | null => {
    const de = posicaoDoItem(atual)
    if (!de) return null
    let melhor: string | null = null
    let menor = Infinity
    for (const item of candidatos) {
      if (item === atual) continue
      const p = posicaoDoItem(item)
      if (!p) continue
      const vx = p.x - de.x
      const vy = p.y - de.y
      const adiante = vx * dx + vy * dy // quanto anda na direção da seta
      const lado = Math.abs(vx * dy - vy * dx) // quanto se afasta dela, para o lado
      if (adiante <= 1 || lado > adiante * 1.3) continue
      const custo = adiante + lado * 2
      if (custo < menor) {
        menor = custo
        melhor = item
      }
    }
    return melhor
  }
  /**
   * Na mesa geral: para onde dá para andar a partir do item atual. De uma ficha, para as
   * caixas das associações dela e para as fichas ligadas; de uma caixa, para as duas
   * fichas que ela liga. (Só o que está desenhado: a legenda pode esconder relações.)
   */
  const vizinhancaNaMesa = (atual: string): string[] => {
    const arestas = rf.getEdges() as { id: string; source: string; target: string }[]
    const desenhada = (id: string) => !!document.querySelector(`.assoc[data-assoc="${id}"]`)
    if (atual.startsWith(CAIXA)) {
      const e = arestas.find((x) => x.id === atual.slice(CAIXA.length))
      return e ? [e.source, e.target] : []
    }
    return arestas
      .filter((e) => (e.source === atual || e.target === atual) && desenhada(e.id))
      .flatMap((e) => [CAIXA + e.id, e.source === atual ? e.target : e.source])
  }
  /** Fichas ligadas à ficha em foco (por associações não escondidas pela legenda). */
  const vizinhosTexto = useStore((s) => {
    if (!foco) return ''
    const lista: string[] = []
    for (const e of s.edges) {
      const rel = (e.data as DadosAresta | undefined)?.assoc.rel ?? ''
      if (ocultas.includes(chaveRelacao(rel))) continue
      if (e.source === foco) lista.push(e.target)
      else if (e.target === foco) lista.push(e.source)
    }
    return lista.join('|')
  })
  const pontasTexto = useStore((s) => {
    const e = s.edges.find((x) => x.id === ativa)
    return e ? `${e.source}|${e.target}` : ''
  })

  // --- Desenho (caneta, marcador, grifo, borracha) ---
  const [ferramenta, setFerramenta] = useState<Ferramenta | null>(null)
  const mudarFerramenta = (f: Ferramenta | null) => {
    setFerramenta(f)
    if (f) {
      setLigando(false)
      setEscolhida(null)
    }
  }

  const alternarLigando = (on: boolean) => {
    setLigando(on)
    setEscolhida(null)
    if (on) {
      setFerramenta(null)
      avisar(t('aviso.associar'))
    }
  }
  const aoClicarFicha = (chave: string) => {
    // No recorte, clicar num texto ligado o leva para o centro.
    if (recorte && !ligando && !ferramenta) {
      if (chave !== recorte.centro) irPara(chave)
      return
    }
    if (!ligando) {
      // Fora do modo de associar, clicar numa ficha põe o foco nela
      // (clicar de novo na mesma ficha mantém o foco: o clique duplo, que dá zoom, não o desfaz)
      if (!ferramenta) {
        setFoco(chave)
        setMarcado(null)
      }
      return
    }
    if (!escolhida) {
      setEscolhida(chave)
      avisar(t('aviso.segunda'))
      return
    }
    setEscolhida(null)
    if (escolhida === chave) return
    // Só conta a associação que aparece nesta coleção: em outra coleção, o mesmo par
    // pode ter outra relação.
    const existente = mesa.associacoes.find(
      (x) =>
        associacaoNaColecao(x, mesa.colecao) &&
        ((x.a === escolhida && x.b === chave) || (x.a === chave && x.b === escolhida)),
    )
    if (existente) abrirAssoc(existente.id)
    else abrirAssoc(criarAssociacao(rf, escolhida, chave), true)
  }
  const aoClicarFundo = () => {
    if (ligando) setEscolhida(null)
    setMarcado(null)
    if (!recorte) setFoco(null)
  }

  // Esc sai do desenho, depois do modo de associar, depois fecha o painel, depois sai
  // do recorte e por fim do foco. No recorte, ← → caminham pelas caixas e textos ligados,
  // Enter leva o texto marcado para o centro (ou abre a associação marcada) e Backspace volta.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return
      if (e.key === 'Escape') {
        if (ferramenta) setFerramenta(null)
        else if (ligando) {
          setLigando(false)
          setEscolhida(null)
        } else if (ativa) setAtiva(null)
        else if (recorte) sairDoRecorte()
        else {
          setFoco(null)
          setMarcado(null)
        }
        return
      }
      if (ferramenta || ligando || modo !== 'mesa') return
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      const direcoes: Record<string, [number, number]> = {
        ArrowRight: [1, 0],
        ArrowLeft: [-1, 0],
        ArrowDown: [0, 1],
        ArrowUp: [0, -1],
      }
      // Mesa geral: anda a partir da ficha em foco, pelas associações dela.
      if (!recorte) {
        if (!foco) return
        const atual = marcado ?? foco
        if (direcoes[e.key]) {
          e.preventDefault()
          const proximo = itemNaDirecao(atual, vizinhancaNaMesa(atual), ...direcoes[e.key])
          if (!proximo) return
          // Chegando a uma ficha, ela vira o foco (e mostra as associações dela).
          if (proximo.startsWith(CAIXA)) setMarcado(proximo)
          else {
            setFoco(proximo)
            setMarcado(null)
          }
          mostrarItem(proximo)
        } else if (e.key === 'Enter' && marcado?.startsWith(CAIXA)) {
          e.preventDefault()
          abrirAssoc(marcado.slice(CAIXA.length))
        }
        return
      }
      if (direcoes[e.key]) {
        e.preventDefault()
        const atual = marcado ?? recorte.centro
        const proximo = itemNaDirecao(atual, [recorte.centro, ...itensRecorte], ...direcoes[e.key])
        if (proximo) {
          setMarcado(proximo === recorte.centro ? null : proximo)
          mostrarItem(proximo)
        }
      } else if (e.key === 'Enter' && marcado) {
        e.preventDefault()
        if (marcado.startsWith(CAIXA)) abrirAssoc(marcado.slice(CAIXA.length))
        else irPara(marcado)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        voltarNoRecorte()
      }
    }
    addEventListener('keydown', aoTeclar)
    return () => removeEventListener('keydown', aoTeclar)
  })

  const contexto: ContextoMesa = useMemo(
    () => ({
      ligando,
      escolhida,
      ativa,
      pontas: pontasTexto ? pontasTexto.split('|') : [],
      notas,
      busca: normalizar(busca.trim()),
      ferramenta,
      foco,
      vizinhos: vizinhosTexto ? vizinhosTexto.split('|') : [],
      ocultas,
      recorte: recorte?.centro ?? null,
      marcado,
      abrirAssoc: (id: string) => abrirAssoc(id),
    }),
    [ligando, escolhida, ativa, pontasTexto, notas, busca, ferramenta, foco, vizinhosTexto, ocultas, recorte, marcado, abrirAssoc],
  )

  return (
    <Contexto.Provider value={contexto}>
      <div className="app">
        <header className="barra">
          <div className="marca">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="24" height="24" />
            {NOME_APP}
            <span className="subtitulo">{t('app.subtitulo')}</span>
          </div>
          {bib && (
            <>
              {/* O que ver: coleção e busca. */}
              <div className="grupo">
                <SeletorColecao bib={bib} valor={colecao} aoMudar={escolherColecao} />
                {modo === 'mesa' && (
                  <input
                    className="busca"
                    type="search"
                    placeholder={t('barra.busca')}
                    aria-label={t('barra.buscaRotulo')}
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                )}
                <button className="btn com-icone" onClick={() => setJanela('nova')}>
                  <FilePlus2 size={16} aria-hidden="true" />
                  {t('nova.botao')}
                </button>
              </div>
              <span className="divisor" aria-hidden="true" />
              {/* Como ver: mesa ou lista. */}
              <div className="grupo">
                <div className="segmentado" role="group" aria-label={t('barra.modoVer')}>
                  <button className="btn" aria-pressed={modo === 'mesa'} onClick={() => setModo('mesa')}>
                    {t('barra.mesa')}
                  </button>
                  <button className="btn" aria-pressed={modo === 'lista'} onClick={() => setModo('lista')}>
                    {t('barra.lista')}
                  </button>
                </div>
                {bib.problemas.length > 0 && (
                  <button className="btn alerta" onClick={() => setModo('lista')}>
                    {t('barra.problemas', { n: bib.problemas.length })}
                  </button>
                )}
              </div>
              {modo === 'mesa' && (
                <>
                  <span className="divisor" aria-hidden="true" />
                  {/* Ferramentas da mesa. */}
                  <div className="grupo">
                    <BarraMesa colecao={colecao} avisar={avisar} emRecorte={!!recorte} />
                    <button className="btn" aria-pressed={ligando} onClick={() => alternarLigando(!ligando)}>
                      {t('barra.associar')}
                    </button>
                    <button
                      className="btn icone"
                      aria-pressed={!!ferramenta}
                      aria-label={t('barra.desenhar')}
                      title={t('barra.desenharDica')}
                      onClick={() => mudarFerramenta(ferramenta ? null : 'caneta')}
                    >
                      <Pencil size={17} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <button
                      className="btn"
                      aria-pressed={notas}
                      onClick={() => {
                        setNotas(!notas)
                        alterarMesa((e) => (e.notas = !notas))
                      }}
                    >
                      {t('barra.anotacoes')}
                    </button>
                  </div>
                </>
              )}
              <div className="grupo direita">
                {modo === 'mesa' && <BarraZoom />}
                <MenuMais
                  itens={[
                    [t('menu.novidades'), () => recarregar()],
                    [t('menu.lerTudo'), () => recarregar(true)],
                    [t('menu.tema'), () => setJanela('tema')],
                    [t('menu.exportar'), () => setJanela('exportar')],
                    [t('menu.importar'), () => setJanela('importar')],
                    [t('menu.arquivo'), () => setJanela('arquivo')],
                    [t('menu.idioma'), () => mudarIdioma(idioma === 'en' ? 'pt-BR' : 'en')],
                    ...(MODO_LOCAL ? [] : [[t('menu.desconectar'), desconectar] as [string, () => void]]),
                  ]}
                />
              </div>
            </>
          )}
        </header>

        {!conectado ? (
          <Conectar
            motivo={motivoConexao}
            aoConectar={() => {
              setMotivoConexao(null)
              setEstado({ tipo: 'carregando' })
              setConectado(true)
              recarregar(true)
            }}
          />
        ) : estado.tipo === 'erro' ? (
          <Aviso titulo={t('aviso.erroLer')} problema>
            {estado.motivo}{' '}
            <button className="btn" onClick={() => recarregar()}>
              {t('aviso.tentarDeNovo')}
            </button>
          </Aviso>
        ) : !bib ? (
          <Aviso titulo={t('aviso.lendo')} />
        ) : (
          // A mesa fica sempre montada (para não perder as posições); a lista abre por cima.
          <div className="conteudo">
            <Mesa
              bib={bib}
              colecao={colecao}
              ligando={ligando}
              recorte={recorte?.centro ?? null}
              ocultas={ocultas}
              aoMontarRecorte={setItensRecorte}
              notas={notas}
              aoClicarFicha={aoClicarFicha}
              aoClicarFundo={aoClicarFundo}
              ferramenta={modo === 'mesa' ? ferramenta : null}
              aoMudarFerramenta={mudarFerramenta}
            />
            {modo === 'mesa' && !ativa && (
              <Legenda
                ocultas={ocultas}
                aoMudarOcultas={setOcultas}
                foco={foco}
                aoSairDoFoco={() => setFoco(null)}
                recorte={recorte}
                aoEntrarNoRecorte={entrarNoRecorte}
                aoVoltar={voltarNoRecorte}
                aoSairDoRecorte={sairDoRecorte}
              />
            )}
            {modo === 'mesa' && ativa && (
              // key: cada associação abre um painel novo (zera a confirmação de remover).
              <PainelAssoc
                key={ativa}
                bib={bib}
                id={ativa}
                focarRelacao={focarRelacao}
                aoFechar={fecharAssoc}
                avisar={avisar}
              />
            )}
            {modo === 'lista' && (
              <main className="rolagem sobre-a-mesa">
                <div className="inicio">
                  <Listagem bib={bib} colecao={colecao} />
                </div>
              </main>
            )}
          </div>
        )}
        {conectado && bib && <SituacaoSalvamento />}
        {janela === 'tema' && <DialogoTema tema={tema} aoMudar={mudarTema} aoFechar={() => setJanela(null)} />}
        {janela === 'exportar' && bib && (
          <DialogoExportar bib={bib} colecao={colecao} aoFechar={() => setJanela(null)} />
        )}
        {janela === 'arquivo' && <DialogoArquivo aoFechar={() => setJanela(null)} />}
        {janela === 'nova' && bib && (
          <DialogoNovaFicha bib={bib} colecaoInicial={colecao} aoFechar={() => setJanela(null)} aoSalvar={() => recarregar()} />
        )}
        {janela === 'importar' && bib && (
          <DialogoImportar bib={bib} aoFechar={() => setJanela(null)} avisar={avisar} />
        )}
        {aviso && (
          <div className="aviso" role="status">
            {aviso}
          </div>
        )}
      </div>
    </Contexto.Provider>
  )
}

function Aviso({ titulo, problema, children }: { titulo: string; problema?: boolean; children?: React.ReactNode }) {
  return (
    <main className="rolagem">
      <div className="inicio">
        <div className={`cartao${problema ? ' problema' : ''}`}>
          <h1>{titulo}</h1>
          {children && <p>{children}</p>}
        </div>
      </div>
    </main>
  )
}

/**
 * Anota na mesa as fichas que sumiram do Zotero (se estavam na mesa) e esquece as
 * que voltaram. Devolve quantas fichas novas e quantas sumidas há, para avisar.
 */
function registrarMudancas(bib: Biblioteca): { novas: string[]; sumiram: number } {
  const naMesa = (k: string) => !!mesa.fichas[k] || mesa.associacoes.some((a) => a.a === k || a.b === k)
  const sumiram = bib.sumiram.filter((f) => naMesa(f.chave))
  const voltaram = bib.fichas.filter((f) => mesa.removidas[f.chave])
  if (sumiram.length || voltaram.length) {
    const em = new Date().toISOString()
    alterarMesa((e) => {
      for (const f of sumiram) {
        e.removidas[f.chave] = { autorAno: f.autorAno, obra: f.obra, tese: f.tese, ref: f.ref, colecoes: f.colecoes, em }
      }
      for (const f of voltaram) delete e.removidas[f.chave]
    })
  }
  const jaTemMesa = Object.keys(mesa.fichas).length > 0
  const novas = jaTemMesa ? bib.fichas.filter((f) => !mesa.fichas[f.chave]).map((f) => f.chave) : []
  return { novas, sumiram: sumiram.length }
}

/** Botão "Menu" com as ações menos usadas. Fecha ao escolher, ao clicar fora ou com Esc. */
function MenuMais({ itens }: { itens: [string, () => void][] }) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    addEventListener('pointerdown', fora)
    addEventListener('keydown', tecla)
    return () => {
      removeEventListener('pointerdown', fora)
      removeEventListener('keydown', tecla)
    }
  }, [aberto])
  return (
    <div className="menu-mais" ref={caixa}>
      <button className="btn" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        {t('menu.botao')}
      </button>
      {aberto && (
        <div className="menu-lista" role="menu">
          {itens.map(([nome, acao]) => (
            <button
              key={nome}
              role="menuitem"
              onClick={() => {
                setAberto(false)
                acao()
              }}
            >
              {nome}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Aviso discreto, no canto, de que a mesa está salva. */
function SituacaoSalvamento() {
  const s = useSituacao()
  const texto =
    s.tipo === 'salvo'
      ? t('salvo.ok')
      : s.tipo === 'pendente'
        ? t('salvo.pendente')
        : s.tipo === 'nova'
          ? t('salvo.nova')
          : s.tipo === 'erro'
            ? s.motivo
            : t('salvo.recuperado')
  return (
    <div className={`situacao${s.tipo === 'erro' || s.tipo === 'recuperado' ? ' ruim' : ''}`} role="status">
      {texto}
    </div>
  )
}

/** Lista de coleções com fichas, em árvore, com a contagem (incluindo subcoleções). */
function SeletorColecao({ bib, valor, aoMudar }: { bib: Biblioteca; valor: string; aoMudar: (c: string) => void }) {
  const opcoes: { c: Colecao; nivel: number; n: number }[] = []
  const percorrer = (pai: string | null, nivel: number) => {
    for (const c of bib.colecoes.filter((x) => x.pai === pai)) {
      const chaves = comSubcolecoes(c.chave, bib.colecoes)
      const n = bib.fichas.filter((f) => f.colecoes.some((k) => chaves.has(k))).length
      if (n > 0 || c.chave === valor) opcoes.push({ c, nivel, n })
      percorrer(c.chave, nivel + 1)
    }
  }
  percorrer(null, 0)
  return (
    <select className="sel-bib" value={valor} onChange={(e) => aoMudar(e.target.value)} aria-label={t('barra.colecao')}>
      <option value="*">{t('barra.todasColecoes', { n: bib.fichas.length })}</option>
      {opcoes.map(({ c, nivel, n }) => (
        <option key={c.chave} value={c.chave}>
          {'   '.repeat(nivel)}
          {c.nome} ({n})
        </option>
      ))}
    </select>
  )
}

export default App
