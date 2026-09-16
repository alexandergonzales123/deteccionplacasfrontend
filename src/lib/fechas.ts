/** Formato de fechas en español (Perú). Las fechas del contrato llegan como ISO 8601. */
import { format, formatDistanceToNowStrict, isValid, parseISO, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

export function aFecha(valor: string | number | Date | null | undefined): Date | null {
  if (valor === null || valor === undefined) return null
  const d = typeof valor === 'string' ? parseISO(valor) : new Date(valor)
  return isValid(d) ? d : null
}

/** "hace 12 s", "hace 3 min", "hace 2 h". Vacío si la fecha es inválida. */
export function formatoRelativo(valor: string | number | Date | null | undefined, ahora: Date = new Date()): string {
  const d = aFecha(valor)
  if (!d) return ''
  const seg = Math.max(0, Math.round((ahora.getTime() - d.getTime()) / 1000))
  // date-fns dice "hace 0 segundos"; en un feed en vivo "ahora" comunica mejor.
  if (seg < 1) return 'ahora'
  if (seg < 60) return `hace ${seg} s`
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86_400) {
    const h = Math.floor(seg / 3600)
    const m = Math.floor((seg % 3600) / 60)
    return m > 0 ? `hace ${h} h ${m} min` : `hace ${h} h`
  }
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: es })
}

/** "16 sep 2026 · 14:03:27". */
export function formatoAbsoluto(valor: string | number | Date | null | undefined): string {
  const d = aFecha(valor)
  return d ? format(d, "dd MMM yyyy '·' HH:mm:ss", { locale: es }) : ''
}

/** "14:03:27". */
export function formatoHora(valor: string | number | Date | null | undefined): string {
  const d = aFecha(valor)
  return d ? format(d, 'HH:mm:ss', { locale: es }) : ''
}

/** "martes, 16 de septiembre de 2026". */
export function formatoFechaLarga(valor: Date): string {
  return format(valor, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
}

/** Clave estable del día local ("2026-09-16"): sirve para memoizar por día. */
export function claveDia(fecha: Date): string {
  return format(fecha, 'yyyy-MM-dd')
}

/** Inicio (00:00 local) del día identificado por `claveDia`, en ISO UTC. */
export function inicioDeDiaISO(clave: string): string {
  // parseISO trata "yyyy-MM-dd" como medianoche LOCAL (no UTC).
  return startOfDay(parseISO(clave)).toISOString()
}
