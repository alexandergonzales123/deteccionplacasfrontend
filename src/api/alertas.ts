/** Tag `Alertas` del contrato (CU-06). */
import { http, limpiarParams } from './client'
import type { Alerta, CambioEstadoAlertaInput, EstadoAlerta, Pagina, ParamsPaginacion } from './types'

export interface ParamsListarAlertas extends ParamsPaginacion {
  estado?: EstadoAlerta
  desde?: string
  hasta?: string
}

/** GET /alertas · rol mínimo: operador. */
export async function listarAlertas(params: ParamsListarAlertas = {}): Promise<Pagina<Alerta>> {
  const { data } = await http.get<Pagina<Alerta>>('/alertas', { params: limpiarParams(params) })
  return data
}

/** GET /alertas/{alertaId}. */
export async function obtenerAlerta(alertaId: string): Promise<Alerta> {
  const { data } = await http.get<Alerta>(`/alertas/${encodeURIComponent(alertaId)}`)
  return data
}

/**
 * PATCH /alertas/{alertaId} · rol mínimo: operador.
 * Se admite volver a `nueva` para reabrir (CA-13). Todo cambio queda auditado.
 */
export async function cambiarEstadoAlerta(alertaId: string, body: CambioEstadoAlertaInput): Promise<Alerta> {
  const { data } = await http.patch<Alerta>(`/alertas/${encodeURIComponent(alertaId)}`, body)
  return data
}
