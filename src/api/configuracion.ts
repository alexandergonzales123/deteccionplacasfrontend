/** Tag `Configuracion` del contrato (CU-11, Ley N.º 29733). */
import { http } from './client'
import type { PoliticaRetencion, PoliticaRetencionInput } from './types'

/** GET /configuracion/retencion · rol mínimo: visor. Debe poder mostrarse a la ciudadanía. */
export async function obtenerPoliticaRetencion(): Promise<PoliticaRetencion> {
  const { data } = await http.get<PoliticaRetencion>('/configuracion/retencion')
  return data
}

/** PUT /configuracion/retencion · rol mínimo: admin. */
export async function actualizarPoliticaRetencion(body: PoliticaRetencionInput): Promise<PoliticaRetencion> {
  const { data } = await http.put<PoliticaRetencion>('/configuracion/retencion', body)
  return data
}
