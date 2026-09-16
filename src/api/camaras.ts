/** Tag `Camaras` del contrato (CU-07, CU-08, CU-09). */
import { http, limpiarParams } from './client'
import type {
  Camara,
  CamaraCreada,
  CamaraDetalle,
  CamaraInput,
  EstadoCamara,
  HeartbeatInput,
  Pagina,
  ParamsPaginacion,
} from './types'

export interface ParamsListarCamaras extends ParamsPaginacion {
  estado?: EstadoCamara
}

/** GET /camaras · rol mínimo: visor. */
export async function listarCamaras(params: ParamsListarCamaras = {}): Promise<Pagina<Camara>> {
  const { data } = await http.get<Pagina<Camara>>('/camaras', { params: limpiarParams(params) })
  return data
}

/** POST /camaras · rol mínimo: admin. La `apiKey` de la respuesta se muestra una sola vez (CA-14). */
export async function crearCamara(body: CamaraInput): Promise<CamaraCreada> {
  const { data } = await http.post<CamaraCreada>('/camaras', body)
  return data
}

/** GET /camaras/{camaraId} · rol mínimo: visor. Incluye último heartbeat. */
export async function obtenerCamara(camaraId: string): Promise<CamaraDetalle> {
  const { data } = await http.get<CamaraDetalle>(`/camaras/${encodeURIComponent(camaraId)}`)
  return data
}

/** PUT /camaras/{camaraId} · rol mínimo: admin. */
export async function actualizarCamara(camaraId: string, body: CamaraInput): Promise<Camara> {
  const { data } = await http.put<Camara>(`/camaras/${encodeURIComponent(camaraId)}`, body)
  return data
}

/** DELETE /camaras/{camaraId} · rol mínimo: admin. Baja lógica. */
export async function darDeBajaCamara(camaraId: string): Promise<void> {
  await http.delete(`/camaras/${encodeURIComponent(camaraId)}`)
}

/**
 * POST /camaras/{camaraId}/heartbeat · autenticación `apiKeyAuth` (X-Device-Api-Key).
 * Lo consume el dispositivo edge, no el panel. Se incluye por completitud del
 * contrato; el panel nunca debería llamarlo en producción.
 */
export async function enviarHeartbeat(camaraId: string, body: HeartbeatInput, apiKey: string): Promise<void> {
  await http.post(`/camaras/${encodeURIComponent(camaraId)}/heartbeat`, body, {
    headers: { 'X-Device-Api-Key': apiKey },
  })
}
