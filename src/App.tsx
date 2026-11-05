import { useCallback, useEffect, useState } from 'react'
import { carregarBiblioteca, type Biblioteca } from './zotero/biblioteca.ts'
import { Listagem } from './Listagem.tsx'

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
  const recarregar = useCallback(() => {
    setEstado({ tipo: 'carregando' })
    setPedido((n) => n + 1)
  }, [])

  useEffect(() => {
    if (FALTA_CONFIG.length) return
    let valido = true
    carregarBiblioteca()
      .then((bib) => valido && setEstado({ tipo: 'pronto', bib }))
      .catch((e: unknown) => valido && setEstado({ tipo: 'erro', motivo: e instanceof Error ? e.message : String(e) }))
    return () => {
      valido = false
    }
  }, [pedido])

  return (
    <>
      <header className="barra">
        <div className="marca">Mesa de fichas</div>
      </header>
      <main className="inicio">
        {FALTA_CONFIG.length > 0 ? (
          <div className="cartao problema">
            <h1>Falta configurar o Zotero</h1>
            <p>
              Abra o arquivo <code>.env.local</code> na pasta do projeto e preencha: {FALTA_CONFIG.join(' e ')}.
              Depois feche e rode de novo <code>npm run dev</code>.
            </p>
          </div>
        ) : estado.tipo === 'carregando' ? (
          <div className="cartao">
            <h1>Lendo o Zotero…</h1>
          </div>
        ) : estado.tipo === 'erro' ? (
          <div className="cartao problema">
            <h1>Não deu certo ler o Zotero</h1>
            <p>{estado.motivo}</p>
            <button className="btn" onClick={recarregar}>
              Tentar de novo
            </button>
          </div>
        ) : (
          <Listagem bib={estado.bib} aoRecarregar={recarregar} />
        )}
      </main>
    </>
  )
}

export default App
