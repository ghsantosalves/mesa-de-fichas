// Nova ficha: escolhe a coleção e o texto do Zotero; o que o Zotero já sabe do texto
// (autor, ano, título, referência ABNT) vem preenchido. Ao salvar, a ficha vira uma
// nota filha do texto, com a tag "ficha" (a única escrita que o app faz no Zotero).
// Sem chave com escrita, dá para copiar o texto e colar no Zotero.

import { useEffect, useMemo, useState } from 'react'
import type { Biblioteca } from '../zotero/biblioteca.ts'
import {
  autorAno,
  autorComRelacao,
  conceitoComPaginas,
  criarNotaFilha,
  marcaDePaginas,
  listarTextos,
  podeEscrever,
  referenciaABNT,
  textoDaFicha,
  type CamposNovaFicha,
  type TextoZotero,
} from '../zotero/cadastro.ts'
import { MODO_LOCAL } from '../zotero/credenciais.ts'
import { normalizar } from '../mesa/contexto.ts'
import { nomeCampo } from '../estado/mesa.ts'
import { Dialogo } from './Dialogo.tsx'
import { CampoDuplo } from './CampoDuplo.tsx'
import { CampoFicha } from './CampoFicha.tsx'
import { idioma, t } from '../i18n.ts'

const RELACOES =
  idioma === 'en'
    ? ['builds on', 'critiques', 'extends', 'dialogues with', 'contrasts with', 'mentions', 'object']
    : ['apoia-se em', 'critica', 'amplia', 'dialoga com', 'contrasta com', 'menciona', 'objeto']

const USOS =
  idioma === 'en'
    ? ['theory', 'methodology', 'bibliography', 'argument', 'case study', 'context', 'source']
    : ['teoria', 'metodologia', 'bibliografia', 'argumentação', 'estudo de caso', 'contexto', 'fonte']

type Props = {
  bib: Biblioteca
  colecaoInicial: string
  aoFechar: () => void
  /** Chamado depois de salvar (para o app buscar a ficha nova no Zotero). */
  aoSalvar: () => void
}

type Lista = { chave: string; textos: TextoZotero[]; erro: string | null }

const camposVazios = (): CamposNovaFicha => ({
  cabecalho: '',
  ref: '',
  tese: '',
  conceitos: '',
  lembrar: '',
  dialogos: '',
  uso: '',
  video: '',
  fichamento: '',
})

export function DialogoNovaFicha({ bib, colecaoInicial, aoFechar, aoSalvar }: Props) {
  const [colecao, setColecao] = useState(colecaoInicial)
  const [busca, setBusca] = useState('')
  const [buscaAtrasada, setBuscaAtrasada] = useState('')
  const [lista, setLista] = useState<Lista | null>(null)
  const [texto, setTexto] = useState<TextoZotero | null>(null)
  const [campos, setCampos] = useState<CamposNovaFicha>(camposVazios)
  const [usos, setUsos] = useState<string[]>([])
  // Conceitos e diálogos: listas de itens (o " · " entre eles é posto pelo app).
  const [conceitos, setConceitos] = useState<string[]>([])
  /** Página(s) da tese (o app acrescenta "[p. …]" ao fim da tese). */
  const [paginaTese, setPaginaTese] = useState('')
  const [rascConceitos, setRascConceitos] = useState('')
  const [dialogos, setDialogos] = useState<string[]>([])
  const [rascDialogos, setRascDialogos] = useState('')
  const [escrita, setEscrita] = useState<boolean | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null)
  const [salva, setSalva] = useState(false)

  // A chave pode escrever? (confere uma vez, ao abrir)
  useEffect(() => {
    podeEscrever()
      .then(setEscrita)
      .catch(() => setEscrita(false))
  }, [])

  // Em "Todas as coleções" a busca vai ao Zotero: espera a pessoa parar de digitar.
  useEffect(() => {
    const espera = setTimeout(() => setBuscaAtrasada(busca), 400)
    return () => clearTimeout(espera)
  }, [busca])

  // Textos da coleção (ou da busca, em "Todas").
  const chaveLista = colecao === '*' ? `*|${buscaAtrasada.trim()}` : colecao
  useEffect(() => {
    let valido = true
    listarTextos(colecao, buscaAtrasada)
      .then((textos) => valido && setLista({ chave: chaveLista, textos, erro: null }))
      .catch((e) => valido && setLista({ chave: chaveLista, textos: [], erro: e instanceof Error ? e.message : String(e) }))
    return () => {
      valido = false
    }
    // chaveLista resume colecao e (em "Todas") a busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveLista])
  const carregando = lista?.chave !== chaveLista

  // Coleções em árvore (todas: um texto novo pode estar numa coleção ainda sem fichas).
  const colecoes = useMemo(() => {
    const r: { chave: string; nome: string; nivel: number }[] = []
    const percorrer = (pai: string | null, nivel: number) => {
      for (const c of bib.colecoes.filter((x) => x.pai === pai)) {
        r.push({ chave: c.chave, nome: c.nome, nivel })
        percorrer(c.chave, nivel + 1)
      }
    }
    percorrer(null, 0)
    return r
  }, [bib])

  const comFicha = useMemo(() => new Set(bib.fichas.map((f) => f.chavePai).filter(Boolean)), [bib])
  const visiveis = (lista?.textos ?? []).filter(
    (x) => colecao === '*' || !busca.trim() || normalizar(`${autorAno(x)} ${x.data.title ?? ''}`).includes(normalizar(busca.trim())),
  )

  const escolher = (x: TextoZotero) => {
    setTexto(x)
    setCampos({ ...camposVazios(), cabecalho: `${autorAno(x)}, ${x.data.title ?? ''}`.trim(), ref: referenciaABNT(x) })
    setUsos([])
    setConceitos([])
    setPaginaTese('')
    setRascConceitos('')
    setDialogos([])
    setRascDialogos('')
    setMsg(null)
    setSalva(false)
  }
  const mudar = (k: keyof CamposNovaFicha) => (e: { target: { value: string } }) => setCampos({ ...campos, [k]: e.target.value })
  const alternarUso = (u: string) => setUsos(usos.includes(u) ? usos.filter((x) => x !== u) : [...usos, u])
  const juntar = (itens: string[], rascunho: string) => [...itens, rascunho.trim()].filter(Boolean).join(' · ')
  const tese = [campos.tese.trim(), campos.tese.trim() ? marcaDePaginas(paginaTese) : ''].filter(Boolean).join(' ')
  const textoFinal = textoDaFicha({
    ...campos,
    tese,
    conceitos: juntar(conceitos, rascConceitos),
    dialogos: juntar(dialogos, rascDialogos),
    uso: usos.join(' · '),
  })

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoFinal)
      setMsg({ texto: t('nova.copiado') })
    } catch {
      setMsg({ texto: t('jan.naoCopiou'), erro: true })
    }
  }
  const salvar = async () => {
    if (!texto) return
    setSalvando(true)
    setMsg({ texto: t('nova.salvando') })
    try {
      await criarNotaFilha(texto.key, textoFinal)
      setSalva(true)
      setMsg({ texto: t('nova.salva') })
      aoSalvar()
    } catch (e) {
      setMsg({ texto: e instanceof Error ? e.message : String(e), erro: true })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialogo titulo={t('nova.titulo')} aoFechar={aoFechar}>
      <p className="d-texto">{t('nova.explica')}</p>

      {!texto ? (
        <>
          <label className="d-rot" htmlFor="nf-col">
            {t('nova.colecao')}
          </label>
          <select id="nf-col" className="sel-bib" value={colecao} onChange={(e) => setColecao(e.target.value)}>
            <option value="*">{t('barra.todasColecoes', { n: bib.fichas.length })}</option>
            {colecoes.map((c) => (
              <option key={c.chave} value={c.chave}>
                {'   '.repeat(c.nivel)}
                {c.nome}
              </option>
            ))}
          </select>
          <input
            className="busca nf-busca"
            type="search"
            placeholder={t('nova.buscar')}
            aria-label={t('nova.buscar')}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {colecao === '*' && busca.trim().length < 2 ? (
            <p className="d-dica">{t('nova.buscarTodas')}</p>
          ) : carregando ? (
            <p className="d-dica">{t('nova.carregando')}</p>
          ) : lista?.erro ? (
            <p className="d-msg erro">{lista.erro}</p>
          ) : visiveis.length === 0 ? (
            <p className="d-dica">{t('nova.nenhum')}</p>
          ) : (
            <ul className="nf-lista">
              {visiveis.map((x) => (
                <li key={x.key}>
                  <button className="nf-item" onClick={() => escolher(x)}>
                    <strong>{autorAno(x)}</strong> {x.data.title}
                    {comFicha.has(x.key) && <span className="nf-tem">{t('nova.jaTem')}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="nf-escolhido">
            <span>
              <strong>{t('nova.texto')}:</strong> {autorAno(texto)} — {texto.data.title}
            </span>
            {!salva && (
              <button className="btn" onClick={() => setTexto(null)}>
                {t('nova.trocar')}
              </button>
            )}
          </div>

          <CampoFicha rotulo={t('nova.cabecalho')} htmlFor="nf-cab" ajuda="cab" dica={t('nova.cabecalhoDica')}>
            <input id="nf-cab" className="rel-input" value={campos.cabecalho} onChange={mudar('cabecalho')} />
          </CampoFicha>

          <CampoFicha rotulo={t('nova.ref')} htmlFor="nf-ref" ajuda="ref" dica={t('nova.refDica')}>
            <textarea id="nf-ref" className="d-area baixa" value={campos.ref} onChange={mudar('ref')} />
          </CampoFicha>

          <CampoFicha rotulo={nomeCampo('tese')} htmlFor="nf-tese" ajuda="tese" obrigatorio>
            <textarea id="nf-tese" className="d-area baixa" value={campos.tese} onChange={mudar('tese')} />
            <div className="nf-paginas">
              <label htmlFor="nf-tese-pag">{t('tese.paginasRotulo')}</label>
              <input
                id="nf-tese-pag"
                className="rel-input"
                placeholder={t('tese.paginas')}
                value={paginaTese}
                onChange={(e) => setPaginaTese(e.target.value)}
              />
            </div>
          </CampoFicha>

          <CampoFicha rotulo={nomeCampo('conceitos')} htmlFor="nf-conc" ajuda="conc" dica={t('nova.listaDica')}>
            <CampoDuplo
              id="nf-conc"
              itens={conceitos}
              aoMudar={setConceitos}
              aoMudarRascunho={setRascConceitos}
              primeiro={{ placeholder: t('conc.conceito'), rotulo: t('conc.conceitoRotulo') }}
              segundo={{ placeholder: t('conc.paginas'), rotulo: t('conc.paginasRotulo'), largura: 'estreito' }}
              formatar={conceitoComPaginas}
            />
          </CampoFicha>

          <CampoFicha rotulo={nomeCampo('lembrar')} htmlFor="nf-lemb" ajuda="lemb">
            <input id="nf-lemb" className="rel-input" value={campos.lembrar} onChange={mudar('lembrar')} />
          </CampoFicha>

          <CampoFicha rotulo={nomeCampo('dialogos')} htmlFor="nf-dial" ajuda="dial" dica={t('nova.dialogosDica')}>
            <CampoDuplo
              id="nf-dial"
              itens={dialogos}
              aoMudar={setDialogos}
              aoMudarRascunho={setRascDialogos}
              primeiro={{ placeholder: t('dial.autor'), rotulo: t('dial.autorRotulo') }}
              segundo={{ placeholder: t('dial.relacao'), rotulo: t('dial.relacaoRotulo') }}
              formatar={autorComRelacao}
              sugestoes={RELACOES}
            />
          </CampoFicha>

          <CampoFicha rotulo={nomeCampo('usos')} ajuda="uso">
            <div className="rels">
              {USOS.map((u) => (
                <button key={u} className="btn" aria-pressed={usos.includes(u)} onClick={() => alternarUso(u)}>
                  {u}
                </button>
              ))}
            </div>
          </CampoFicha>

          <CampoFicha rotulo={t('ficha.video')} htmlFor="nf-video" ajuda="video">
            <input id="nf-video" className="rel-input" placeholder="—" value={campos.video} onChange={mudar('video')} />
          </CampoFicha>

          <CampoFicha rotulo={t('ficha.fichamento')} htmlFor="nf-fich" ajuda="fich">
            <input id="nf-fich" className="rel-input" placeholder="—" value={campos.fichamento} onChange={mudar('fichamento')} />
          </CampoFicha>

          <p className="d-rot">{t('nova.previa')}</p>
          <pre className="nf-previa">{textoFinal}</pre>

          {escrita === null && <p className="d-dica">{t('nova.conferindo')}</p>}
          {escrita === false && <p className="d-msg erro">{MODO_LOCAL ? t('nova.chaveLeituraLocal') : t('nova.chaveLeitura')}</p>}
          {!campos.tese.trim() && <p className="d-dica">{t('nova.obrigatoria')}</p>}

          <div className="d-acoes esquerda">
            <button
              className="btn primario"
              disabled={!escrita || !campos.tese.trim() || salvando || salva}
              onClick={salvar}
            >
              {t('nova.salvar')}
            </button>
            <button className="btn" onClick={copiar}>
              {t('nova.copiar')}
            </button>
            <a className="btn" href={`zotero://select/library/items/${texto.key}`}>
              {t('nova.abrirZotero')}
            </a>
          </div>
        </>
      )}

      <div className="d-acoes">
        {msg && <span className={`d-msg${msg.erro ? ' erro' : ''}`}>{msg.texto}</span>}
        <button className="btn primario" onClick={aoFechar}>
          {t('jan.fechar')}
        </button>
      </div>
    </Dialogo>
  )
}
