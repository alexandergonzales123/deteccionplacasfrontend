/**
 * Utilidades del watchlist (CU-05) compartidas por Watchlist y Alertas:
 * etiquetas y colores del enum `MotivoWatchlist` y el cálculo de vencimiento.
 */
import type { MotivoWatchlist, WatchlistItem } from '@/api/types'
import type { TonoBadge } from '@/components/ui/Badge'

/** Orden del enum del contrato; también es el orden del select del formulario. */
export const MOTIVOS_WATCHLIST: readonly MotivoWatchlist[] = [
  'robado',
  'requisitoriado',
  'moroso_papeletas',
  'orden_judicial',
  'otro',
]

export const ETIQUETA_MOTIVO: Record<MotivoWatchlist, string> = {
  robado: 'Robado',
  requisitoriado: 'Requisitoriado',
  moroso_papeletas: 'Moroso de papeletas',
  orden_judicial: 'Orden judicial',
  otro: 'Otro',
}

const TONO_MOTIVO: Record<MotivoWatchlist, TonoBadge> = {
  robado: 'danger',
  requisitoriado: 'warn',
  moroso_papeletas: 'primary',
  orden_judicial: 'violeta',
  otro: 'muted',
}

export function esMotivoWatchlist(v: string | null | undefined): v is MotivoWatchlist {
  return v !== null && v !== undefined && (MOTIVOS_WATCHLIST as readonly string[]).includes(v)
}

// Se valida contra el enum antes de indexar: un valor fuera del enum (p. ej.
// "toString") no debe resolver a propiedades del prototipo.

/** Tono del chip por motivo; un valor fuera del enum (backend desalineado) cae en gris. */
export function tonoMotivo(motivo: MotivoWatchlist | string | null | undefined): TonoBadge {
  return esMotivoWatchlist(motivo) ? TONO_MOTIVO[motivo] : 'muted'
}

export function etiquetaMotivo(motivo: MotivoWatchlist | string | null | undefined): string {
  return esMotivoWatchlist(motivo) ? ETIQUETA_MOTIVO[motivo] : 'Sin motivo'
}

/**
 * CU-05 · 3a: una entrada con `venceEn` en el pasado deja de generar alertas
 * sola (CA-07). El backend puede mantener `activo=true`; el vencimiento se
 * calcula en cliente solo para señalizarlo.
 */
export function estaVencida(item: Pick<WatchlistItem, 'venceEn'>, ahora: Date = new Date()): boolean {
  if (!item.venceEn) return false
  const t = Date.parse(item.venceEn)
  return !Number.isNaN(t) && t <= ahora.getTime()
}
