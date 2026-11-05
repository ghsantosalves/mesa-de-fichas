import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Lê ZOTERO_USER_ID e ZOTERO_API_KEY do arquivo .env.local.
  const env = loadEnv(mode, process.cwd(), 'ZOTERO_')
  const userId = (env.ZOTERO_USER_ID ?? '').trim()
  const apiKey = (env.ZOTERO_API_KEY ?? '').trim()

  return {
    plugins: [react()],
    // O número de usuário não é segredo; pode ir para a página.
    // A chave NÃO vai para a página: só dizemos se ela existe.
    define: {
      __ZOTERO_USER_ID__: JSON.stringify(userId),
      __ZOTERO_CHAVE_CONFIGURADA__: JSON.stringify(apiKey.length > 0),
    },
    server: {
      // Endereço fixo: a mesa fica salva no navegador por endereço, e mudar de
      // porta faria parecer que ela sumiu. Se a porta estiver ocupada, o app avisa.
      port: 5173,
      strictPort: true,
      // A chave fica só aqui, no servidor local: o navegador chama
      // /zotero/... e o servidor repassa para api.zotero.org com a chave.
      proxy: {
        '/zotero': {
          target: 'https://api.zotero.org',
          changeOrigin: true,
          rewrite: (caminho) => caminho.replace(/^\/zotero/, ''),
          headers: {
            'Zotero-API-Key': apiKey,
            'Zotero-API-Version': '3',
          },
        },
      },
    },
  }
})
