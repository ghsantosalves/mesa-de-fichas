import type { FitViewOptions } from '@xyflow/react'

/** Enquadramento do "Ver tudo": zoom entre 20% e 110%, com uma pequena margem. */
export const VER_TUDO: FitViewOptions = { padding: 0.08, minZoom: 0.2, maxZoom: 1.1, duration: 300 }

/** Largura de uma ficha aberta e de uma recolhida, na mesa. */
export const LARGURA_FICHA = 300
export const LARGURA_RECOLHIDA = 240
