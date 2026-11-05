// Tela de conexão com o Zotero (usada no site): pede o número de usuário e a chave,
// confere com o Zotero e guarda só neste navegador.

import { useState } from 'react'
import { salvarCredenciais, testarCredenciais } from './zotero/credenciais.ts'
import { NOME_APP, idioma, t } from './i18n.ts'

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
          <h1>{t('con.titulo')}</h1>
          {motivo && <p className="erro-texto">{motivo}</p>}
          {idioma === 'en' ? (
            <>
              <p>
                {NOME_APP} reads the notes tagged <code>ficha</code> in your Zotero library. It only reads: it never
                changes anything in Zotero.
              </p>
              <ol>
                <li>
                  Open{' '}
                  <a href="https://www.zotero.org/settings/keys" target="_blank" rel="noopener noreferrer">
                    zotero.org/settings/keys
                  </a>{' '}
                  (sign in with your Zotero account).
                </li>
                <li>
                  Copy the number shown in <em>“Your user ID for use in API calls is …”</em>.
                </li>
                <li>
                  Click <em>Create new private key</em>, check only <em>Allow library access</em> and{' '}
                  <em>Allow notes access</em> (leave <em>Allow write access</em> unchecked), save and copy the key.
                </li>
              </ol>
            </>
          ) : (
            <>
              <p>
                A {NOME_APP} lê as notas com a tag <code>ficha</code> da sua biblioteca do Zotero. Ela só lê: nunca
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
            </>
          )}
          <label className="campo">
            <span>{t('con.userId')}</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder={t('con.userIdEx')}
              required
            />
          </label>
          <label className="campo">
            <span>{t('con.chave')}</span>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('con.chaveEx')}
              required
            />
          </label>
          {erro && <p className="erro-texto">{erro}</p>}
          <div className="d-acoes">
            <button className="btn primario" type="submit" disabled={testando}>
              {testando ? t('con.conferindo') : t('con.conectar')}
            </button>
          </div>
          <p className="d-dica">{t('con.dica')}</p>
        </form>
      </div>
    </main>
  )
}
