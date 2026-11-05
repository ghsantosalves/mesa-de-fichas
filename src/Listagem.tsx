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

export function Listagem({ bib, colecao }: { bib: Biblioteca; colecao: string }) {
  const nomeColecao = new Map(bib.colecoes.map((c) => [c.chave, c.nome]))
  const nomes = (chaves: string[]) => chaves.map((k) => nomeColecao.get(k) ?? '(coleção desconhecida)')
  const filtro = colecao === '*' ? null : comSubcolecoes(colecao, bib.colecoes)
  const fichas = filtro ? bib.fichas.filter((f) => f.colecoes.some((k) => filtro.has(k))) : bib.fichas

  return (
    <>
      <section className="resumo">
        <p>
          <strong>{fichas.length}</strong> {fichas.length === 1 ? 'ficha' : 'fichas'}
          {filtro && ` em “${nomeColecao.get(colecao)}”`} · <strong>{bib.problemas.length}</strong> com
          problema · {bib.colecoes.length} coleções · versão da biblioteca {bib.versao}
        </p>
      </section>

      {bib.problemas.length > 0 && (
        <section>
          <h2>Fichas com problema</h2>
          <p className="explica">
            Estas notas têm a tag <code>ficha</code>, mas não estão no formato. Corrija no Zotero e clique
            em “Recarregar do Zotero”.
          </p>
          {bib.problemas.map((p) => (
            <CartaoProblema key={p.chave} p={p} colecoes={nomes(p.colecoes)} />
          ))}
        </section>
      )}

      <section>
        <h2>Fichas</h2>
        {fichas.length === 0 && <p className="explica">Nenhuma ficha no formato certo aqui.</p>}
        {fichas.map((f) => (
          <CartaoFicha key={f.chave} f={f} colecoes={nomes(f.colecoes)} />
        ))}
      </section>

      <section>
        <h2>Coleções</h2>
        <p className="explica">Entre parênteses, quantas fichas há em cada coleção, contando as subcoleções.</p>
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
        {campo('Tese', f.tese)}
        {campo('Conceitos', f.conceitos.join(' · '))}
        {campo('Para lembrar', f.lembrar)}
        {campo('Diálogos', f.dialogos.join(' · '))}
        {f.usos.length > 0 && (
          <div>
            <dt>Uso no projeto</dt>
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
        <span className="bibs">{colecoes.length ? colecoes.join(' · ') : 'Sem coleção'}</span>
        <Link url={f.video} texto="Vídeo da aula" />
        <Link url={f.fichamento} texto="Fichamento completo" />
        <a href={linkZotero(f)}>Abrir no Zotero</a>
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
      <div className="autor">{p.titulo || '(sem título)'}</div>
      <ul className="motivos">
        {p.motivos.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <details>
        <summary>Ver o texto da nota</summary>
        <pre>{p.texto}</pre>
      </details>
      <div className="pe">
        <span className="bibs">{colecoes.length ? colecoes.join(' · ') : 'Sem coleção'}</span>
        <a href={linkZotero(p)}>Abrir no Zotero</a>
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
