/** Tag `Auditoria` del contrato (CU-10). Registros inmutables: solo lectura. */
import { http, limpiarParams } from './client'
import type { Pagina, ParamsPaginacion, RegistroAuditoria } from './types'

export interface ParamsAuditoria extends ParamsPaginacion {
  usuarioId?: string
  placa?: string
  desde?: string
  hasta?: string
}

/** GET /auditoria/consultas · rol mínimo: admin. */
export async function listarConsultasAuditoria(params: ParamsAuditoria = {}): Promise<Pagina<RegistroAuditoria>> {
  const { data } = await http.get<Pagina<RegistroAuditoria>>('/auditoria/consultas', {
    params: limpiarParams(params),
  })
  return data
}
