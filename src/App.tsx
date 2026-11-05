import { useCallback, useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { carregarBiblioteca, comSubcolecoes, type Biblioteca, type Colecao } from './zotero/biblioteca.ts'
import { Listagem } from './Listagem.tsx'
import { Mesa } from './mesa/Mesa.tsx'
import { BarraZoom } from './mesa/BarraZoom.tsx'
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
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const [pedido, setPedido] = useState(0)
  const [modo, setModo] = useState<'mesa' | 'lista'>('mesa')
  const [colecao, setColecao] = useState(mesa.colecao)
  const recarregar = useCallback(() => setPedido((n) => n + 1), [])
  const escolherColecao = useCallback((c: string) => {
    setColecao(c)
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

  return (
    <ReactFlowProvider>
      <div className="app">
        <header className="barra">
          <div className="marca">Mesa de fichas</div>
          {bib && (
            <div className="grupo">
              <SeletorColecao bib={bib} valor={colecao} aoMudar={escolherColecao} />
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
            <Mesa bib={bib} colecao={colecao} />
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
      </div>
    </ReactFlowProvider>
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
