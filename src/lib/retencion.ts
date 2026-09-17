/**
 * Política de retención (CU-11, CA-10, Ley N.º 29733): estado de la purga
 * diaria y límites del schema `PoliticaRetencionInput` del contrato.
 */
import type { PoliticaRetencionInput } from '@/api/types'
import type { TonoBadge } from '@/components/ui/Badge'
import { segundosDesde } from './fechas'

/**
 * La purga es una tarea diaria (CU-11). Con 36 h de margen se tolera un
 * desfase razonable de la tarea programada antes de marcarla atrasada.
 */
export const UMBRAL_PURGA_ATRASADA_HORAS = 36

export type EstadoPurga = 'al_dia' | 'atrasada' | 'sin_registro'

export function estadoPurga(ultimaPurgaEn: string | null | undefined, ahora: Date = new Date()): EstadoPurga {
  const seg = segundosDesde(ultimaPurgaEn, ahora)
  if (seg === null) return 'sin_registro'
  return seg < UMBRAL_PURGA_ATRASADA_HORAS * 3600 ? 'al_dia' : 'atrasada'
}

export const ESTILO_PURGA: Record<EstadoPurga, { etiqueta: string; tono: TonoBadge }> = {
  al_dia: { etiqueta: 'Purga al día', tono: 'ok' },
  atrasada: { etiqueta: 'Purga atrasada', tono: 'warn' },
  sin_registro: { etiqueta: 'Sin purga registrada', tono: 'muted' },
}

/** "3" para 1095 días; "2.7" si no es entero (1 decimal); 366 días → "1" (redondeo a un decimal). */
export function aniosDesdeDias(dias: number): string {
  const anios = Math.round((dias / 365) * 10) / 10
  return Number.isInteger(anios) ? String(anios) : anios.toFixed(1)
}

/** Mínimos y máximos de `PoliticaRetencionInput` (contrato v0.2.0). */
export const LIMITES_RETENCION: Record<keyof PoliticaRetencionInput, { min: number; max: number }> = {
  diasDeteccionesSinAlerta: { min: 1, max: 365 },
  diasDeteccionesConAlerta: { min: 1, max: 3650 },
  diasImagenes: { min: 1, max: 365 },
  diasAuditoria: { min: 365, max: 3650 },
}

export const CAMPOS_RETENCION = [
  'diasDeteccionesSinAlerta',
  'diasDeteccionesConAlerta',
  'diasImagenes',
  'diasAuditoria',
] as const satisfies readonly (keyof PoliticaRetencionInput)[]

export const ETIQUETA_CAMPO_RETENCION: Record<keyof PoliticaRetencionInput, string> = {
  diasDeteccionesSinAlerta: 'Detecciones sin alerta (días)',
  diasDeteccionesConAlerta: 'Detecciones con alerta (días)',
  diasImagenes: 'Imágenes de evidencia (días)',
  diasAuditoria: 'Registro de auditoría (días)',
}

/** Valida un campo: entero dentro del rango. Devuelve el mensaje de error o null. */
export function validarDiasRetencion(campo: keyof PoliticaRetencionInput, valor: string): string | null {
  const { min, max } = LIMITES_RETENCION[campo]
  if (valor.trim() === '') return 'Obligatorio.'
  const n = Number(valor)
  if (!Number.isInteger(n)) return 'Debe ser un número entero.'
  if (n < min || n > max) return `Entre ${min} y ${max}.`
  return null
}
