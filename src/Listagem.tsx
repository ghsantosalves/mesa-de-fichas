// Lista em texto o que foi lido do Zotero, para conferir a interpretação.
// As "Fichas com problema" aparecem sempre, qualquer que seja a coleção escolhida.

import {
  comSubcolecoes,
  linkZotero,
  type Biblioteca,
  type Colecao,
  type Ficha,
  type FichaComProblema,
} from './zotero/biblioteca.ts'
import { t } from './i18n.ts'
import { nomeCampo } from './estado/mesa.ts'

export function Listagem({ bib, colecao }: { bib: Biblioteca; colecao: string }) {
  const nomeColecao = new Map(bib.colecoes.map((c) => [c.chave, c.nome]))
  const nomes = (chaves: string[]) => chaves.map((k) => nomeColecao.get(k) ?? t('lista.desconhecida'))
  const filtro = colecao === '*' ? null : comSubcolecoes(colecao, bib.colecoes)
  const fichas = filtro ? bib.fichas.filter((f) => f.colecoes.some((k) => filtro.has(k))) : bib.fichas

  return (
    <>
      <section className="resumo">
        <p>
          <strong>{fichas.length}</strong> {fichas.length === 1 ? t('lista.ficha.1') : t('lista.ficha.n')}
          {filtro && t('lista.em', { nome: nomeColecao.get(colecao) ?? '' })}
          {t('lista.resumo', { p: bib.problemas.length, c: bib.colecoes.length, v: bib.versao })}
        </p>
      </section>

      {bib.problemas.length > 0 && (
        <section>
          <h2>{t('lista.problemas')}</h2>
          <p className="explica">{t('lista.problemasExplica')}</p>
          {bib.problemas.map((p) => (
            <CartaoProblema key={p.chave} p={p} colecoes={nomes(p.colecoes)} />
          ))}
        </section>
      )}

      <section>
        <h2>{t('lista.fichas')}</h2>
        {fichas.length === 0 && <p className="explica">{t('lista.nenhuma')}</p>}
        {fichas.map((f) => (
          <CartaoFicha key={f.chave} f={f} colecoes={nomes(f.colecoes)} />
        ))}
      </section>

      <section>
        <h2>{t('lista.colecoes')}</h2>
        <p className="explica">{t('lista.colecoesExplica')}</p>
        <ArvoreColecoes bib={bib} pai={null} />
      </section>
    </>
  )
}

function CartaoFicha({ f, colecoes }: { f: Ficha; colecoes: string[] }) {
  const campo = (rotulo: string, v: string) =>
    v && (
      <div>
        <dt>{rotulo}</dt>
        <dd>{v}</dd>
      </div>
    )
  return (
    <article className="cartao ficha">
      <div className="autor">{f.autorAno}</div>
      {f.obra && <div className="obra">{f.obra}</div>}
      <dl className="campos">
        {campo(nomeCampo('tese'), f.tese)}
        {campo(nomeCampo('conceitos'), f.conceitos.join(' · '))}
        {campo(nomeCampo('lembrar'), f.lembrar)}
        {campo(nomeCampo('dialogos'), f.dialogos.join(' · '))}
        {f.usos.length > 0 && (
          <div>
            <dt>{nomeCampo('usos')}</dt>
            <dd className="tags">
              {f.usos.map((u) => (
                <span className="tag" key={u}>
                  {u}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
      {f.ref && <p className="ref">{f.ref}</p>}
      <div className="pe">
        <span className="bibs">{colecoes.length ? colecoes.join(' · ') : t('ficha.semColecao')}</span>
        <Link url={f.video} texto={t('ficha.video')} />
        <Link url={f.fichamento} texto={t('ficha.fichamento')} />
        <a href={linkZotero(f)}>{t('ficha.abrirZotero')}</a>
      </div>
      {f.avisos.length > 0 && (
        <ul className="avisos">
          {f.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </article>
  )
}

function Link({ url, texto }: { url: string; texto: string }) {
  if (!/^https?:\/\//.test(url)) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {texto}
    </a>
  )
}

function CartaoProblema({ p, colecoes }: { p: FichaComProblema; colecoes: string[] }) {
  return (
    <article className="cartao problema">
      <div className="autor">{p.titulo || t('lista.semTitulo')}</div>
      <ul className="motivos">
        {p.motivos.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <details>
        <summary>{t('lista.verTexto')}</summary>
        <pre>{p.texto}</pre>
      </details>
      <div className="pe">
        <span className="bibs">{colecoes.length ? colecoes.join(' · ') : t('ficha.semColecao')}</span>
        <a href={linkZotero(p)}>{t('ficha.abrirZotero')}</a>
      </div>
    </article>
  )
}

function ArvoreColecoes({ bib, pai }: { bib: Biblioteca; pai: string | null }) {
  const filhas = bib.colecoes.filter((c) => c.pai === pai)
  if (!filhas.length) return null
  return (
    <ul className="arvore">
      {filhas.map((c) => (
        <li key={c.chave}>
          <span className={contar(c, bib) ? '' : 'vazia'}>
            {c.nome} ({contar(c, bib)})
          </span>
          <ArvoreColecoes bib={bib} pai={c.chave} />
        </li>
      ))}
    </ul>
  )
}

function contar(c: Colecao, bib: Biblioteca) {
  const chaves = comSubcolecoes(c.chave, bib.colecoes)
  return bib.fichas.filter((f) => f.colecoes.some((k) => chaves.has(k))).length
}
