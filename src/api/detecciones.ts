/** Tag `Detecciones` del contrato (CU-01 ingesta edge, CU-02 panel en vivo). */
import { http, limpiarParams } from './client'
import type { Deteccion, DeteccionInput, PaginaDetecciones, ParamsPaginacion } from './types'

export interface ParamsListarDetecciones extends ParamsPaginacion {
  camaraId?: string
  /** ISO date-time. */
  desde?: string
  /** ISO date-time. */
  hasta?: string
  /** 0..1, default 0.7 en el servidor. */
  confianzaMinima?: number
  soloAlertas?: boolean
}

/**
 * GET /detecciones · rol mínimo: operador. Cada consulta queda auditada.
 * Devuelve de la más reciente a la más antigua.
 */
export async function listarDetecciones(params: ParamsListarDetecciones = {}): Promise<PaginaDetecciones> {
  const { data } = await http.get<PaginaDetecciones>('/detecciones', { params: limpiarParams(params) })
  return data
}

/**
 * POST /detecciones · autenticación `apiKeyAuth`. Lo consume el edge, no el
 * panel. Se incluye por completitud del contrato (útil para pruebas manuales).
 * Devuelve 201 si es nueva o 200 si `eventoUuid` ya existía (idempotencia, CA-03).
 */
export async function ingestarDeteccion(
  body: DeteccionInput,
  apiKey: string,
  imagen?: Blob,
): Promise<{ deteccion: Deteccion; yaExistia: boolean }> {
  const headers = { 'X-Device-Api-Key': apiKey }
  if (imagen) {
    const form = new FormData()
    // `metadatos` va como campo de texto (JSON serializado), NO como Blob: un
    // Blob sale con filename="blob" y FastAPI lo interpretaría como UploadFile.
    // El backend debe leerlo como `metadatos: str = Form(...)` y parsear el JSON.
    form.append('metadatos', JSON.stringify(body))
    form.append('imagen', imagen, 'placa.jpg')
    const res = await http.post<Deteccion>('/detecciones', form, { headers })
    return { deteccion: res.data, yaExistia: res.status === 200 }
  }
  const res = await http.post<Deteccion>('/detecciones', body, { headers })
  return { deteccion: res.data, yaExistia: res.status === 200 }
}

/**
 * GET /detecciones/{deteccionId}/imagen · rol mínimo: operador. Auditada.
 * 404 no existe · 410 purgada por retención. Devuelve el JPEG como Blob.
 */
export async function descargarImagenDeteccion(deteccionId: string): Promise<Blob> {
  const { data } = await http.get<Blob>(`/detecciones/${encodeURIComponent(deteccionId)}/imagen`, {
    responseType: 'blob',
    headers: { Accept: 'image/jpeg' },
  })
  return data
}
