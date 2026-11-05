// Salvar a mesa em arquivo .json ou abrir uma mesa salva antes.

import { useState } from 'react'
import { arquivoDaMesa, lerArquivoDaMesa, substituirMesa, type EstadoMesa } from '../estado/mesa.ts'
import { baixar } from '../exportar.ts'
import { Dialogo } from './Dialogo.tsx'

export function DialogoArquivo({ aoFechar }: { aoFechar: () => void }) {
  const [lida, setLida] = useState<EstadoMesa | null>(null)
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null)

  const salvar = () => {
    baixar(`mesa-de-fichas-${new Date().toISOString().slice(0, 10)}.json`, arquivoDaMesa(), 'application/json')
    setMsg({ texto: 'Arquivo baixado (veja a pasta Downloads).' })
  }
  const escolher = async (arquivo: File | undefined) => {
    setLida(null)
    if (!arquivo) return
    try {
      const m = lerArquivoDaMesa(await arquivo.text())
      setLida(m)
      setMsg({
        texto: `Arquivo lido: ${Object.keys(m.fichas).length} fichas posicionadas, ${m.areas.length} áreas, ${m.associacoes.length} associações.`,
      })
    } catch {
      setMsg({ texto: 'Este arquivo não é uma mesa salva por este app.', erro: true })
    }
  }
  const substituir = () => {
    if (!lida) return
    substituirMesa(lida)
    location.reload()
  }

  return (
    <Dialogo titulo="Salvar ou abrir mesa" aoFechar={aoFechar}>
      <p className="d-texto">
        A mesa já é salva sozinha neste navegador a cada mudança. O arquivo serve para guardar uma cópia, manter
        versões diferentes ou levar a mesa para outro navegador ou computador. O conteúdo das fichas continua no
        Zotero; o arquivo guarda a arrumação: posições, cores, áreas, associações com anotações e tema.
      </p>
      <div className="d-bloco">
        <p className="d-rot">Salvar mesa em arquivo</p>
        <button className="btn primario" onClick={salvar}>
          Salvar arquivo da mesa
        </button>
      </div>
      <div className="d-bloco">
        <p className="d-rot">Abrir mesa de um arquivo</p>
        <p className="d-texto">
          Abrir um arquivo substitui a mesa atual. Por segurança, uma cópia da mesa atual fica guardada no navegador,
          mas se quiser mantê-la à mão, salve-a em arquivo antes.
        </p>
        <input type="file" accept=".json,application/json" onChange={(e) => escolher(e.target.files?.[0])} />
        {lida && (
          <button className="btn perigo" onClick={substituir}>
            Substituir a mesa atual
          </button>
        )}
      </div>
      <div className="d-acoes">
        {msg && <span className={`d-msg${msg.erro ? ' erro' : ''}`}>{msg.texto}</span>}
        <button className="btn primario" onClick={aoFechar}>
          Fechar
        </button>
      </div>
    </Dialogo>
  )
}
