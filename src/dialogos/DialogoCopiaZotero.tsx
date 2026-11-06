// Cópia da mesa no Zotero: mostra a cópia guardada (data e o que tem), permite guardar
// agora e recuperar a mesa a partir dela. Também aparece sozinho quando este navegador
// ainda não tem mesa e há uma cópia no Zotero.

import { useEffect, useState } from 'react'
import { substituirMesa } from '../estado/mesa.ts'
import { buscarCopia, guardarCopia, liberarCopiaAutomatica, useCopiaZotero, type CopiaNoZotero } from '../zotero/copiaMesa.ts'
import { Dialogo } from './Dialogo.tsx'
import { data, t } from '../i18n.ts'

type Props = {
  aoFechar: () => void
  /** Aberto sozinho: este navegador não tinha mesa e há uma cópia no Zotero. */
  oferta: boolean
}

export function DialogoCopiaZotero({ aoFechar, oferta }: Props) {
  const { escrita } = useCopiaZotero()
  /** undefined = lendo; null = não há cópia. */
  const [copia, setCopia] = useState<CopiaNoZotero | null | undefined>(undefined)
  const [erroLer, setErroLer] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null)
  const [guardando, setGuardando] = useState(false)

  const ler = () =>
    buscarCopia()
      .then((c) => {
        setCopia(c)
        setErroLer(null)
      })
      .catch((e) => {
        setCopia(null)
        setErroLer(e instanceof Error ? e.message : String(e))
      })
  useEffect(() => {
    ler()
  }, [])

  const fechar = () => {
    // Quem não quis usar a cópia oferecida segue com a mesa deste navegador, que passa a ser copiada.
    if (oferta) liberarCopiaAutomatica()
    aoFechar()
  }
  const usar = () => {
    if (!copia) return
    substituirMesa(copia.mesa)
    location.reload()
  }
  const guardar = async () => {
    setGuardando(true)
    setMsg({ texto: t('copia.guardando') })
    try {
      await guardarCopia()
      liberarCopiaAutomatica()
      setMsg({ texto: t('copia.guardada') })
      await ler()
    } catch (e) {
      setMsg({ texto: e instanceof Error ? e.message : String(e), erro: true })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={t('copia.titulo')} aoFechar={fechar}>
      <p className="d-texto">{oferta ? t('copia.oferta') : t('copia.explica')}</p>

      <p className="d-rot">{t('copia.guardadaNoZotero')}</p>
      {copia === undefined ? (
        <p className="d-dica">{t('copia.lendo')}</p>
      ) : erroLer ? (
        <p className="d-msg erro">{erroLer}</p>
      ) : copia === null ? (
        <p className="d-dica">{t('copia.nenhuma')}</p>
      ) : (
        <>
          <p className="d-texto">
            {t('copia.resumo', {
              data: copia.quando ? data(new Date(copia.quando)) : '?',
              f: Object.keys(copia.mesa.fichas).length,
              a: copia.mesa.areas.length,
              s: copia.mesa.associacoes.length,
            })}
          </p>
          <button className="btn primario" onClick={usar}>
            {t('copia.usar')}
          </button>
          <p className="d-dica">{t('copia.usarDica')}</p>
        </>
      )}

      {!oferta && (
        <>
          <p className="d-rot">{t('copia.guardarAgora')}</p>
          {escrita === false ? (
            <p className="d-dica">{t('copia.semEscrita')}</p>
          ) : (
            <>
              <button className="btn" disabled={guardando || escrita === null} onClick={guardar}>
                {t('copia.guardarAgora')}
              </button>
              <p className="d-dica">{t('copia.automatica')}</p>
            </>
          )}
        </>
      )}

      <div className="d-acoes">
        {msg && <span className={`d-msg${msg.erro ? ' erro' : ''}`}>{msg.texto}</span>}
        <button className="btn primario" onClick={fechar}>
          {oferta ? t('copia.naoUsar') : t('jan.fechar')}
        </button>
      </div>
    </Dialogo>
  )
}
