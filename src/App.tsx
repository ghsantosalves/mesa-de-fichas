import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlowProvider, useReactFlow, useStore } from '@xyflow/react'
import { Pencil } from 'lucide-react'
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
import { Contexto, normalizar, type ContextoMesa, type Ferramenta } from './mesa/contexto.ts'
import type { NoMesa } from './mesa/operacoes.ts'
import { alterarMesa, mesa, useSituacao, type Tema } from './estado/mesa.ts'
import { aoMudarSistema, aplicarTema } from './tema.ts'
import { DialogoTema } from './dialogos/DialogoTema.tsx'
import { DialogoExportar } from './dialogos/DialogoExportar.tsx'
import { DialogoArquivo } from './dialogos/DialogoArquivo.tsx'
import { DialogoImportar } from './dialogos/DialogoImportar.tsx'

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
  const ultimaLeitura = useRef(0)
  const anunciadas = useRef(new Set<string>())
  const recarregar = useCallback((completa = false) => setPedido((p) => ({ n: p.n + 1, completa })), [])
  const escolherColecao = useCallback((c: string) => {
    setColecao(c)
    // Trocar de coleção fecha o painel da associação.
    setAtiva(null)
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
  const [janela, setJanela] = useState<'tema' | 'exportar' | 'arquivo' | 'importar' | null>(null)
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
    if (!ligando) {
      // Fora do modo de associar, clicar numa ficha liga/desliga o foco nela.
      if (!ferramenta) setFoco((f) => (f === chave ? null : chave))
      return
    }
    if (!escolhida) {
      setEscolhida(chave)
      avisar(t('aviso.segunda'))
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
    setFoco(null)
  }

  // Esc sai do desenho, depois do modo de associar, depois fecha o painel.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return
      if (ferramenta) setFerramenta(null)
      else if (ligando) {
        setLigando(false)
        setEscolhida(null)
      } else if (ativa) setAtiva(null)
      else setFoco(null)
    }
    addEventListener('keydown', aoTeclar)
    return () => removeEventListener('keydown', aoTeclar)
  }, [ligando, ferramenta, ativa])

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
      abrirAssoc: (id: string) => abrirAssoc(id),
    }),
    [ligando, escolhida, ativa, pontasTexto, notas, busca, ferramenta, foco, vizinhosTexto, ocultas, abrirAssoc],
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
                    <BarraMesa colecao={colecao} avisar={avisar} />
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
              notas={notas}
              aoClicarFicha={aoClicarFicha}
              aoClicarFundo={aoClicarFundo}
              ferramenta={modo === 'mesa' ? ferramenta : null}
              aoMudarFerramenta={mudarFerramenta}
            />
            {modo === 'mesa' && !ativa && (
              <Legenda ocultas={ocultas} aoMudarOcultas={setOcultas} foco={foco} aoSairDoFoco={() => setFoco(null)} />
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
