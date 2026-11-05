import { useEffect, useState } from 'react'

type Conexao =
  | { estado: 'faltaConfig'; falta: string[] }
  | { estado: 'testando' }
  | { estado: 'ok'; usuario: string; leBiblioteca: boolean; leNotas: boolean }
  | { estado: 'erro'; motivo: string }

/** Resposta de GET /keys/current (só os campos que usamos). */
type InfoChave = {
  userID: number
  username: string
  access?: { user?: { library?: boolean; notes?: boolean } }
}

/** Campos do .env.local que estão vazios. */
const FALTA_CONFIG = [
  ...(__ZOTERO_USER_ID__ ? [] : ['ZOTERO_USER_ID']),
  ...(__ZOTERO_CHAVE_CONFIGURADA__ ? [] : ['ZOTERO_API_KEY']),
]

function App() {
  const [conexao, setConexao] = useState<Conexao>(
    FALTA_CONFIG.length ? { estado: 'faltaConfig', falta: FALTA_CONFIG } : { estado: 'testando' },
  )

  useEffect(() => {
    if (FALTA_CONFIG.length) return

    // Pergunta ao Zotero de quem é a chave, para conferir o .env.local.
    fetch('/zotero/keys/current')
      .then(async (r) => {
        if (r.status === 403 || r.status === 404) {
          throw new Error('O Zotero não reconheceu a chave. Confira ZOTERO_API_KEY no .env.local.')
        }
        if (!r.ok) throw new Error(`O Zotero respondeu com erro ${r.status}.`)
        const info = (await r.json()) as InfoChave
        if (String(info.userID) !== __ZOTERO_USER_ID__) {
          throw new Error(
            `A chave é do usuário ${info.userID}, mas ZOTERO_USER_ID está como ${__ZOTERO_USER_ID__}.`,
          )
        }
        setConexao({
          estado: 'ok',
          usuario: info.username,
          leBiblioteca: !!info.access?.user?.library,
          leNotas: !!info.access?.user?.notes,
        })
      })
      .catch((e: unknown) => {
        const motivo =
          e instanceof TypeError
            ? 'Não consegui falar com o Zotero. Confira a internet e se o app está rodando (npm run dev).'
            : e instanceof Error
              ? e.message
              : String(e)
        setConexao({ estado: 'erro', motivo })
      })
  }, [])

  return (
    <>
      <header className="barra">
        <div className="marca">Mesa de fichas</div>
      </header>
      <main className="inicio">
        <StatusZotero conexao={conexao} />
      </main>
    </>
  )
}

function StatusZotero({ conexao }: { conexao: Conexao }) {
  switch (conexao.estado) {
    case 'testando':
      return (
        <div className="cartao">
          <h1>Conectando ao Zotero…</h1>
        </div>
      )
    case 'faltaConfig':
      return (
        <div className="cartao problema">
          <h1>Falta configurar o Zotero</h1>
          <p>
            Abra o arquivo <code>.env.local</code> na pasta do projeto e preencha:{' '}
            {conexao.falta.join(' e ')}. Depois feche e rode de novo <code>npm run dev</code>.
          </p>
        </div>
      )
    case 'erro':
      return (
        <div className="cartao problema">
          <h1>Não deu certo conectar ao Zotero</h1>
          <p>{conexao.motivo}</p>
        </div>
      )
    case 'ok':
      return (
        <div className="cartao">
          <h1>Tudo pronto</h1>
          <p>O app está rodando e conectado ao Zotero.</p>
          <div className="rotulo">Conta</div>
          <p>{conexao.usuario}</p>
          <div className="rotulo">Permissões da chave</div>
          <p>
            Ler a biblioteca: {conexao.leBiblioteca ? 'sim' : 'não'} · Ler notas:{' '}
            {conexao.leNotas ? 'sim' : 'não'}
          </p>
          {(!conexao.leBiblioteca || !conexao.leNotas) && (
            <p>
              Para as próximas etapas a chave precisa ler a biblioteca e as notas. Ajuste em
              zotero.org/settings/keys.
            </p>
          )}
        </div>
      )
  }
}

export default App
