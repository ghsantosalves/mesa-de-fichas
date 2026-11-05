// Tela de conexão com o Zotero (usada no site): pede o número de usuário e a chave,
// confere com o Zotero e guarda só neste navegador.

import { useState } from 'react'
import { salvarCredenciais, testarCredenciais } from './zotero/credenciais.ts'

export function Conectar({ motivo, aoConectar }: { motivo: string | null; aoConectar: () => void }) {
  const [userId, setUserId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [testando, setTestando] = useState(false)

  const conectar = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestando(true)
    setErro(null)
    const c = { userId, apiKey }
    const problema = await testarCredenciais(c)
    setTestando(false)
    if (problema) return setErro(problema)
    salvarCredenciais(c)
    aoConectar()
  }

  return (
    <main className="rolagem">
      <div className="inicio">
        <form className="cartao conectar" onSubmit={conectar}>
          <h1>Conectar ao seu Zotero</h1>
          {motivo && <p className="erro-texto">{motivo}</p>}
          <p>
            A Mesa de fichas lê as notas com a tag <code>ficha</code> da sua biblioteca do Zotero. Ela só lê: nunca
            muda nada no Zotero.
          </p>
          <ol>
            <li>
              Abra{' '}
              <a href="https://www.zotero.org/settings/keys" target="_blank" rel="noopener noreferrer">
                zotero.org/settings/keys
              </a>{' '}
              (entre com sua conta do Zotero).
            </li>
            <li>
              Copie o número que aparece em <em>“Your user ID for use in API calls is …”</em>.
            </li>
            <li>
              Clique em <em>Create new private key</em>, marque só <em>Allow library access</em> e{' '}
              <em>Allow notes access</em> (deixe <em>Allow write access</em> desmarcado), salve e copie a chave.
            </li>
          </ol>
          <label className="campo">
            <span>Número de usuário (user ID)</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="ex.: 1234567"
              required
            />
          </label>
          <label className="campo">
            <span>Chave (key)</span>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="cole aqui a chave"
              required
            />
          </label>
          {erro && <p className="erro-texto">{erro}</p>}
          <div className="d-acoes">
            <button className="btn primario" type="submit" disabled={testando}>
              {testando ? 'Conferindo…' : 'Conectar'}
            </button>
          </div>
          <p className="d-dica">
            O número e a chave ficam guardados só neste navegador e são enviados só para o Zotero (api.zotero.org).
            Para tirar, use Menu → Desconectar do Zotero.
          </p>
        </form>
      </div>
    </main>
  )
}
