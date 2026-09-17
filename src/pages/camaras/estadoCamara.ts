/** Presentación del enum `EstadoCamara` y de `TipoLente` del contrato. */
import type { EstadoCamara, TipoLente } from '@/api/types'
import type { TonoBadge } from '@/components/ui'

export const ESTADOS_CAMARA: EstadoCamara[] = ['activa', 'mantenimiento', 'inactiva']

export const ETIQUETA_ESTADO: Record<EstadoCamara, string> = {
  activa: 'Activa',
  mantenimiento: 'En mantenimiento',
  inactiva: 'Inactiva',
}

export const TONO_ESTADO: Record<EstadoCamara, TonoBadge> = {
  activa: 'ok',
  mantenimiento: 'warn',
  inactiva: 'muted',
}

export const ETIQUETA_LENTE: Record<TipoLente, string> = {
  fijo: 'Fijo',
  varifocal: 'Varifocal',
}

export function etiquetaLente(tipo: TipoLente | undefined): string {
  return tipo ? (ETIQUETA_LENTE[tipo] ?? tipo) : '—'
}

/**
 * Segundos sin heartbeat a partir de los cuales el último reporte se muestra
 * en ámbar en vez de verde. El edge reporta cada 60 s (contrato).
 * TODO(contrato): `umbralInactividadSegundos` es configuración del backend y
 * no se expone por API; se asume 3 heartbeats perdidos.
 */
export const UMBRAL_HEARTBEAT_SEG = 180

export function formatoCoordenadas(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}
