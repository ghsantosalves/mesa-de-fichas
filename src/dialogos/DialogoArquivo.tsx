// Salvar a mesa em arquivo .json ou abrir uma mesa salva antes.

import { useState } from 'react'
import { arquivoDaMesa, lerArquivoDaMesa, substituirMesa, type EstadoMesa } from '../estado/mesa.ts'
import { baixar } from '../exportar.ts'
import { Dialogo } from './Dialogo.tsx'
import { marcarArquivoSalvo } from '../zotero/copiaMesa.ts'
import { t } from '../i18n.ts'

export function DialogoArquivo({ aoFechar }: { aoFechar: () => void }) {
  const [lida, setLida] = useState<EstadoMesa | null>(null)
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null)

  const salvar = () => {
    baixar(`cordatril-${new Date().toISOString().slice(0, 10)}.json`, arquivoDaMesa(), 'application/json')
    marcarArquivoSalvo()
    setMsg({ texto: t('jan.baixado') })
  }
  const escolher = async (arquivo: File | undefined) => {
    setLida(null)
    if (!arquivo) return
    try {
      const m = lerArquivoDaMesa(await arquivo.text())
      setLida(m)
      setMsg({
        texto: t('arq.lido', { f: Object.keys(m.fichas).length, a: m.areas.length, s: m.associacoes.length }),
      })
    } catch {
      setMsg({ texto: t('arq.invalido'), erro: true })
    }
  }
  const substituir = () => {
    if (!lida) return
    substituirMesa(lida)
    location.reload()
  }

  return (
    <Dialogo titulo={t('arq.titulo')} aoFechar={aoFechar}>
      <p className="d-texto">{t('arq.explica')}</p>
      <div className="d-bloco">
        <p className="d-rot">{t('arq.salvar')}</p>
        <button className="btn primario" onClick={salvar}>
          {t('arq.salvarBotao')}
        </button>
      </div>
      <div className="d-bloco">
        <p className="d-rot">{t('arq.abrir')}</p>
        <p className="d-texto">{t('arq.abrirExplica')}</p>
        <input type="file" accept=".json,application/json" onChange={(e) => escolher(e.target.files?.[0])} />
        {lida && (
          <button className="btn perigo" onClick={substituir}>
            {t('arq.substituir')}
          </button>
        )}
      </div>
      <div className="d-acoes">
        {msg && <span className={`d-msg${msg.erro ? ' erro' : ''}`}>{msg.texto}</span>}
        <button className="btn primario" onClick={aoFechar}>
          {t('jan.fechar')}
        </button>
      </div>
    </Dialogo>
  )
}
