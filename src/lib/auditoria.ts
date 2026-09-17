/**
 * Utilidades de auditoría (CU-10): etiquetas del enum `AccionAuditoria`,
 * heurística de "motivo genérico" y generación de CSV en cliente.
 */
import type { AccionAuditoria, RegistroAuditoria } from '@/api/types'
import { formatearPlaca } from './placas'

/** Orden del enum del contrato; `purga_ejecutada` (DDL 5.3, tarea de purga CU-11) va al final. */
export const ACCIONES_AUDITORIA: readonly AccionAuditoria[] = [
  'busqueda_placa',
  'consulta_avistamientos',
  'consulta_ubicacion_actual',
  'descarga_imagen',
  'exportacion',
  'alta_watchlist',
  'baja_watchlist',
  'cambio_estado_alerta',
  'cambio_retencion',
  'purga_ejecutada',
]

export const ETIQUETA_ACCION: Record<AccionAuditoria, string> = {
  busqueda_placa: 'Búsqueda de placa',
  consulta_avistamientos: 'Consulta de recorrido',
  consulta_ubicacion_actual: 'Consulta de última ubicación',
  descarga_imagen: 'Descarga de evidencia',
  exportacion: 'Exportación',
  alta_watchlist: 'Alta en watchlist',
  baja_watchlist: 'Baja de watchlist',
  cambio_estado_alerta: 'Cambio de estado de alerta',
  cambio_retencion: 'Cambio de retención',
  purga_ejecutada: 'Purga de retención ejecutada',
}

/** Se valida contra el enum antes de indexar (un valor como "toString" no debe resolver al prototipo). */
export function esAccionAuditoria(v: string | null | undefined): v is AccionAuditoria {
  return v !== null && v !== undefined && (ACCIONES_AUDITORIA as readonly string[]).includes(v)
}

/** Etiqueta en español; un valor fuera del enum (backend desalineado) se muestra tal cual. */
export function etiquetaAccion(accion: AccionAuditoria | string): string {
  return esAccionAuditoria(accion) ? ETIQUETA_ACCION[accion] : accion
}

/**
 * Un motivo "con expediente" referencia una denuncia, oficio u orden (palabra
 * completa: "desorden" no cuenta) o un número con formato de expediente:
 * "N.º 4471", "00123-2026", "DEN-2026-4471". Un número suelto ("operativo 123")
 * no basta. Todo lo demás (vacío, "operativo", "control") es genérico: el
 * sistema lo acepta (CA-04 solo exige que exista) pero el auditor debe poder
 * detectarlo de un vistazo (R-03).
 * TODO(contrato): el backend podría clasificar el motivo; esta regex es una
 * aproximación en cliente sobre el texto libre.
 */
export const PATRON_MOTIVO_CON_EXPEDIENTE =
  // `(?<![\p{L}\p{N}])N` y no `\bN`: `\b` es ASCII y "revisión 1234" daría falso positivo tras la "ó".
  /DEN-|EXP-|\bOF\b|\bOFICIO\b|\bDENUNCIA\b|\bORDEN\b|(?<![\p{L}\p{N}])N[°º.]{0,2}\s*\d{3,}|\d{3,}-\d{2,}|[A-Z]{2,}-\d{3,}/iu

export function esMotivoGenerico(motivo: string | null | undefined): boolean {
  if (!motivo || motivo.trim() === '') return true
  return !PATRON_MOTIVO_CON_EXPEDIENTE.test(motivo)
}

/**
 * Acciones que exigen `motivo` en el contrato (parámetro `Motivo` de /placas/*
 * y /detecciones/{id}/imagen). Las administrativas (alta/baja watchlist,
 * cambio de estado, cambio de retención, exportación) no lo llevan y no deben
 * marcarse como "motivo genérico".
 */
const ACCIONES_CON_MOTIVO: ReadonlySet<AccionAuditoria> = new Set([
  'busqueda_placa',
  'consulta_avistamientos',
  'consulta_ubicacion_actual',
  'descarga_imagen',
])

export function requiereMotivo(r: Pick<RegistroAuditoria, 'accion' | 'placaConsultada'>): boolean {
  if (esAccionAuditoria(r.accion)) return ACCIONES_CON_MOTIVO.has(r.accion)
  // Acción fuera del enum: se exige motivo si consultó una placa.
  return Boolean(r.placaConsultada)
}

/** true solo para consultas de placa cuyo motivo es genérico (R-03). */
export function tieneMotivoGenerico(r: Pick<RegistroAuditoria, 'accion' | 'placaConsultada' | 'motivo'>): boolean {
  return requiereMotivo(r) && esMotivoGenerico(r.motivo)
}

// ------------------------------------------------------------------- CSV ----

/**
 * Escapa una celda según RFC 4180: se entrecomilla si contiene coma, comilla,
 * salto de línea o espacios en los extremos; las comillas internas se duplican.
 */
export function escaparCeldaCSV(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return ''
  let s = String(valor)
  // Inyección de fórmulas: Excel/LibreOffice evalúan celdas que empiezan por
  // = + - @ (o tab/CR). Un motivo libre como "=HYPERLINK(...)" se ejecutaría al
  // abrir el reporte; el apóstrofo inicial fuerza texto plano.
  if (/^[\t\r]|^\s*[=+\-@]/.test(s)) s = `'${s}`
  if (/[",\r\n']/.test(s) || s !== s.trim()) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Une filas con CRLF (lo que espera Excel) y celdas con coma. */
export function aCSV(filas: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>): string {
  return filas.map((f) => f.map(escaparCeldaCSV).join(',')).join('\r\n') + '\r\n'
}

export const COLUMNAS_CSV_AUDITORIA = [
  'id',
  'usuario',
  'usuarioId',
  'accion',
  'accionCodigo',
  'placaConsultada',
  'motivo',
  'motivoGenerico',
  'ipOrigen',
  'realizadaEn',
] as const

/**
 * CSV de los registros cargados. `realizadaEn` va en ISO tal como lo devuelve
 * el contrato (sin conversión de zona) para que sea reproducible.
 * TODO(contrato): la acción 'exportacion' del enum sugiere un endpoint
 * server-side que no está definido; esta exportación es solo en cliente y,
 * por tanto, no queda auditada.
 */
export function registrosACSV(registros: readonly RegistroAuditoria[]): string {
  const filas = registros.map((r) => [
    r.id,
    r.usuario?.nombre ?? 'Sistema',
    r.usuario?.id ?? '',
    etiquetaAccion(r.accion),
    r.accion,
    r.placaConsultada ? formatearPlaca(r.placaConsultada) : '',
    r.motivo ?? '',
    requiereMotivo(r) ? (esMotivoGenerico(r.motivo) ? 'si' : 'no') : 'n/a',
    r.ipOrigen ?? '',
    r.realizadaEn,
  ])
  return aCSV([COLUMNAS_CSV_AUDITORIA, ...filas])
}

/** Descarga un texto como archivo mediante Blob + `<a download>`; revoca la URL al terminar. */
export function descargarArchivoTexto(contenido: string, nombre: string, tipo = 'text/csv;charset=utf-8'): void {
  // BOM para que Excel reconozca UTF-8 (tildes en nombres y motivos).
  const blob = new Blob(['﻿', contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Diferido: algunos navegadores aún no iniciaron la descarga al volver de click().
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Formato uuid (parámetro `usuarioId` del contrato). */
export const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function esUuid(v: string): boolean {
  return PATRON_UUID.test(v)
}
