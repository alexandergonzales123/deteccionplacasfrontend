/**
 * Tag `Placas` del contrato (CU-03 búsqueda, CU-04 última ubicación, CU-12 campo).
 * Todas las operaciones exigen `motivo` (4..200 chars) y quedan auditadas.
 * El path param `placa` es SIEMPRE la placa normalizada (^[A-Z0-9]{6,8}$).
 */
import { http, limpiarParams } from './client'
import type { CandidataPlaca, PaginaDetecciones, ParamsPaginacion, UbicacionActual } from './types'

export interface ParamsBuscarPlacas {
  /** Placa completa o parcial. Admite `?` (un carácter) y `*` (varios). */
  patron: string
  /** Default true en el servidor. */
  difusa?: boolean
  /** 1 o 2. Default 1. */
  distanciaMaxima?: 1 | 2
  motivo: string
}

/** GET /placas/buscar · rol mínimo: operador. Candidatas de la más parecida a la menos. */
export async function buscarPlacas(params: ParamsBuscarPlacas): Promise<CandidataPlaca[]> {
  const { data } = await http.get<CandidataPlaca[]>('/placas/buscar', { params: limpiarParams(params) })
  return data
}

export interface ParamsAvistamientos extends ParamsPaginacion {
  desde?: string
  hasta?: string
  motivo: string
}

/** GET /placas/{placa}/avistamientos · rol mínimo: operador. Del más reciente al más antiguo. */
export async function listarAvistamientos(
  placaNormalizada: string,
  params: ParamsAvistamientos,
): Promise<PaginaDetecciones> {
  const { data } = await http.get<PaginaDetecciones>(
    `/placas/${encodeURIComponent(placaNormalizada)}/avistamientos`,
    { params: limpiarParams(params) },
  )
  return data
}

/**
 * GET /placas/{placa}/ubicacion-actual · rol mínimo: operador.
 * 404 si la placa no tiene avistamientos en el periodo retenido.
 * CA-06: la UI NUNCA presenta esto como "ubicación actual" sin calificar `frescura`.
 */
export async function obtenerUbicacionActual(placaNormalizada: string, motivo: string): Promise<UbicacionActual> {
  const { data } = await http.get<UbicacionActual>(
    `/placas/${encodeURIComponent(placaNormalizada)}/ubicacion-actual`,
    { params: { motivo } },
  )
  return data
}

/** GET /placas/{placa}/eventos · polling de seguimiento en vivo por cursor opaco. */
export async function obtenerEventosPlaca(placaNormalizada: string, desdeCursor: string): Promise<PaginaDetecciones> {
  const { data } = await http.get<PaginaDetecciones>(`/placas/${encodeURIComponent(placaNormalizada)}/eventos`, {
    params: { desdeCursor },
  })
  return data
}
