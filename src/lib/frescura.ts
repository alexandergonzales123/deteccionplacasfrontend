/**
 * Frescura del último avistamiento (schema `Frescura` del contrato, CA-06):
 *   reciente < 5 min · probable 5-60 min · antiguo > 60 min.
 * El backend la devuelve en `UbicacionActual.frescura`; este helper la
 * recalcula en cliente con los MISMOS umbrales cuando ese endpoint no responde
 * (404) y solo se dispone de la fecha del avistamiento.
 */
import type { Frescura } from '@/api/types'
import type { TonoBadge } from '@/components/ui/Badge'

export const UMBRAL_RECIENTE_SEG = 300
export const UMBRAL_PROBABLE_SEG = 3600

export function frescuraDesdeSegundos(antiguedadSegundos: number): Frescura {
  if (antiguedadSegundos < UMBRAL_RECIENTE_SEG) return 'reciente'
  if (antiguedadSegundos < UMBRAL_PROBABLE_SEG) return 'probable'
  return 'antiguo'
}

const FRESCURAS: readonly Frescura[] = ['reciente', 'probable', 'antiguo']

/** Guarda contra un valor fuera del enum (backend desalineado) antes de indexar. */
export function esFrescura(v: string | null | undefined): v is Frescura {
  return v !== null && v !== undefined && (FRESCURAS as readonly string[]).includes(v)
}

/** Frescura del contrato si es válida; si no, se recalcula con los mismos umbrales. */
export function frescuraSegura(frescura: string | null | undefined, antiguedadSegundos: number): Frescura {
  return esFrescura(frescura) ? frescura : frescuraDesdeSegundos(antiguedadSegundos)
}

export interface EstiloFrescura {
  etiqueta: string
  descripcion: string
  tono: TonoBadge
  /** Clase de borde para resaltar el ítem más reciente de la línea de tiempo. */
  borde: string
  texto: string
}

export const ESTILO_FRESCURA: Record<Frescura, EstiloFrescura> = {
  reciente: {
    etiqueta: 'Reciente',
    descripcion: 'Visto hace menos de 5 minutos',
    tono: 'ok',
    borde: 'border-ok',
    texto: 'text-ok',
  },
  probable: {
    etiqueta: 'Probable',
    descripcion: 'Visto hace menos de 1 hora',
    tono: 'warn',
    borde: 'border-warn',
    texto: 'text-warn',
  },
  antiguo: {
    etiqueta: 'Antiguo',
    descripcion: 'Visto hace más de 1 hora',
    tono: 'muted',
    borde: 'border-fgMuted',
    texto: 'text-fgMuted',
  },
}

