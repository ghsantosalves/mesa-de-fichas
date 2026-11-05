import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlowProvider, useReactFlow, useStore } from '@xyflow/react'
import { carregarBiblioteca, comSubcolecoes, type Biblioteca, type Colecao } from './zotero/biblioteca.ts'
import { Listagem } from './Listagem.tsx'
import { Mesa } from './mesa/Mesa.tsx'
import { BarraZoom } from './mesa/BarraZoom.tsx'
import { BarraMesa } from './mesa/BarraMesa.tsx'
import { PainelAssoc } from './mesa/PainelAssoc.tsx'
import { criarAssociacao, type ArestaAssoc } from './mesa/assoc.ts'
import { Contexto, type ContextoMesa } from './mesa/contexto.ts'
import type { NoMesa } from './mesa/operacoes.ts'
import { alterarMesa, mesa, useSituacao } from './estado/mesa.ts'

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; motivo: string }
  | { tipo: 'pronto'; bib: Biblioteca }

/** Campos do .env.local que estão vazios. */
const FALTA_CONFIG = [
  ...(__ZOTERO_USER_ID__ ? [] : ['ZOTERO_USER_ID']),
  ...(__ZOTERO_CHAVE_CONFIGURADA__ ? [] : ['ZOTERO_API_KEY']),
]

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
  const [pedido, setPedido] = useState(0)
  const [modo, setModo] = useState<'mesa' | 'lista'>('mesa')
  const [colecao, setColecao] = useState(mesa.colecao)
  /** Associação aberta no painel. */
  const [ativa, setAtiva] = useState<string | null>(null)
  const recarregar = useCallback(() => setPedido((n) => n + 1), [])
  const escolherColecao = useCallback((c: string) => {
    setColecao(c)
    // Trocar de coleção fecha o painel da associação.
    setAtiva(null)
    if (mesa.colecao !== c) alterarMesa((e) => (e.colecao = c))
  }, [])

  useEffect(() => {
    if (FALTA_CONFIG.length) return
    let valido = true
    carregarBiblioteca()
      .then((bib) => {
        if (!valido) return
        setEstado({ tipo: 'pronto', bib })
        // Se a coleção escolhida sumiu do Zotero, volta para "todas".
        if (mesa.colecao !== '*' && !bib.colecoes.some((x) => x.chave === mesa.colecao)) escolherColecao('*')
      })
      .catch((e: unknown) => valido && setEstado({ tipo: 'erro', motivo: e instanceof Error ? e.message : String(e) }))
    return () => {
      valido = false
    }
  }, [pedido, escolherColecao])

  const bib = estado.tipo === 'pronto' ? estado.bib : null

  // --- Associações ---
  const [ligando, setLigando] = useState(false)
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const [focarRelacao, setFocarRelacao] = useState(false)
  const [notas, setNotas] = useState(mesa.notas)
  const [aviso, setAviso] = useState<string | null>(null)
  const tempoAviso = useRef<ReturnType<typeof setTimeout>>(undefined)
  const avisar = useCallback((texto: string) => {
    setAviso(texto)
    clearTimeout(tempoAviso.current)
    tempoAviso.current = setTimeout(() => setAviso(null), 2600)
  }, [])
  const abrirAssoc = useCallback((id: string, focar = false) => {
    setAtiva(id)
    setFocarRelacao(focar)
  }, [])
  const fecharAssoc = useCallback(() => setAtiva(null), [])
  const pontasTexto = useStore((s) => {
    const e = s.edges.find((x) => x.id === ativa)
    return e ? `${e.source}|${e.target}` : ''
  })

  const alternarLigando = (on: boolean) => {
    setLigando(on)
    setEscolhida(null)
    if (on) avisar('Clique em duas fichas para associá-las. Esc para sair.')
  }
  const aoClicarFicha = (chave: string) => {
    if (!ligando) return
    if (!escolhida) {
      setEscolhida(chave)
      avisar('Agora clique na segunda ficha')
      return
    }
    setEscolhida(null)
    if (escolhida === chave) return
    const existente = mesa.associacoes.find(
      (x) => (x.a === escolhida && x.b === chave) || (x.a === chave && x.b === escolhida),
    )
    if (existente) abrirAssoc(existente.id)
    else abrirAssoc(criarAssociacao(rf, escolhida, chave), true)
  }
  const aoClicarFundo = () => {
    if (ligando) setEscolhida(null)
  }

  // Esc sai do modo de associar ou fecha o painel.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (ligando) {
        setLigando(false)
        setEscolhida(null)
      } else setAtiva(null)
    }
    addEventListener('keydown', aoTeclar)
    return () => removeEventListener('keydown', aoTeclar)
  }, [ligando])

  const contexto: ContextoMesa = useMemo(
    () => ({
      ligando,
      escolhida,
      ativa,
      pontas: pontasTexto ? pontasTexto.split('|') : [],
      notas,
      abrirAssoc: (id: string) => abrirAssoc(id),
    }),
    [ligando, escolhida, ativa, pontasTexto, notas, abrirAssoc],
  )

  return (
    <Contexto.Provider value={contexto}>
      <div className="app">
        <header className="barra">
          <div className="marca">Mesa de fichas</div>
          {bib && (
            <div className="grupo">
              <SeletorColecao bib={bib} valor={colecao} aoMudar={escolherColecao} />
              {modo === 'mesa' && (
                <>
                  <BarraMesa colecao={colecao} />
                  <button className="btn" aria-pressed={ligando} onClick={() => alternarLigando(!ligando)}>
                    Associar fichas
                  </button>
                  <button
                    className="btn"
                    aria-pressed={notas}
                    onClick={() => {
                      setNotas(!notas)
                      alterarMesa((e) => (e.notas = !notas))
                    }}
                  >
                    Anotações visíveis
                  </button>
                </>
              )}
              <button className="btn" aria-pressed={modo === 'mesa'} onClick={() => setModo('mesa')}>
                Mesa
              </button>
              <button className="btn" aria-pressed={modo === 'lista'} onClick={() => setModo('lista')}>
                Lista
              </button>
              {bib.problemas.length > 0 && (
                <button className="btn alerta" onClick={() => setModo('lista')}>
                  Fichas com problema ({bib.problemas.length})
                </button>
              )}
              <button className="btn" onClick={recarregar}>
                Recarregar do Zotero
              </button>
            </div>
          )}
          {bib && modo === 'mesa' && <BarraZoom />}
        </header>

        {FALTA_CONFIG.length > 0 ? (
          <Aviso titulo="Falta configurar o Zotero" problema>
            Abra o arquivo <code>.env.local</code> na pasta do projeto e preencha: {FALTA_CONFIG.join(' e ')}.
            Depois feche e rode de novo <code>npm run dev</code>.
          </Aviso>
        ) : estado.tipo === 'erro' ? (
          <Aviso titulo="Não deu certo ler o Zotero" problema>
            {estado.motivo}{' '}
            <button className="btn" onClick={recarregar}>
              Tentar de novo
            </button>
          </Aviso>
        ) : !bib ? (
          <Aviso titulo="Lendo o Zotero…" />
        ) : (
          // A mesa fica sempre montada (para não perder as posições); a lista abre por cima.
          <div className="conteudo">
            <Mesa
              bib={bib}
              colecao={colecao}
              ligando={ligando}
              notas={notas}
              aoClicarFicha={aoClicarFicha}
              aoClicarFundo={aoClicarFundo}
            />
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
        <SituacaoSalvamento />
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

/** Aviso discreto, no canto, de que a mesa está salva. */
function SituacaoSalvamento() {
  const s = useSituacao()
  const texto =
    s.tipo === 'salvo'
      ? 'Mesa salva neste navegador'
      : s.tipo === 'pendente'
        ? 'Salvando…'
        : s.tipo === 'nova'
          ? 'Mesa nova: as mudanças serão salvas neste navegador'
          : s.tipo === 'erro'
            ? s.motivo
            : 'A mesa salva estava ilegível e começou de novo. Uma cópia do conteúdo antigo foi guardada no navegador.'
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
    <select className="sel-bib" value={valor} onChange={(e) => aoMudar(e.target.value)} aria-label="Coleção">
      <option value="*">Todas as coleções ({bib.fichas.length})</option>
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
