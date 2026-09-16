/**
 * Cliente HTTP único para la API (`servers[0]` del contrato, configurable por
 * `VITE_API_BASE_URL`). Implementa el esquema `bearerAuth` del contrato:
 *  - adjunta `Authorization: Bearer <token>` en cada petición,
 *  - ante 401 intenta UNA renovación con `POST /auth/refresh` y reintenta,
 *  - si la renovación falla, limpia la sesión y avisa a la app (logout).
 */
import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { ApiError, LoginResponse } from './types'
import { sesionStorage } from '@/auth/sesionStorage'

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/v1'

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})

/** Se dispara cuando la sesión ya no puede recuperarse (refresh fallido). */
export const EVENTO_SESION_EXPIRADA = 'centinela:sesion-expirada'

type ConfigConReintento = InternalAxiosRequestConfig & { _reintentado?: boolean }

/** Rutas con `security: []` en el contrato, o autenticadas con `apiKeyAuth`. */
function usaBearer(config: InternalAxiosRequestConfig): boolean {
  const url = config.url ?? ''
  if (url.includes('/auth/login') || url.includes('/auth/refresh')) return false
  if (config.headers.has('X-Device-Api-Key')) return false
  return true
}

http.interceptors.request.use((config) => {
  const token = sesionStorage.leerToken()
  if (token && usaBearer(config)) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Un único refresh en vuelo: si varias peticiones reciben 401 a la vez,
// todas esperan la misma renovación en lugar de disparar N refresh.
let refreshEnCurso: Promise<string> | null = null

/** Cierra la sesión local y avisa a la app. Idempotente: se ejecuta una sola vez por expiración. */
function expirarSesion(): void {
  if (!sesionStorage.leerToken() && !sesionStorage.leerRefreshToken()) return
  sesionStorage.limpiar()
  window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA))
}

async function renovarToken(): Promise<string> {
  const refreshToken = sesionStorage.leerRefreshToken()
  if (!refreshToken) throw new Error('Sin refresh token')
  try {
    // Se usa axios "crudo" para no pasar por los interceptores de esta instancia.
    const { data } = await axios.post<LoginResponse>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 15_000 },
    )
    sesionStorage.guardar(data)
    return data.token
  } catch (err) {
    // Se expira aquí (una vez) y no en cada petición que esperaba el refresh.
    expirarSesion()
    throw err
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiError>) => {
    const config = error.config as ConfigConReintento | undefined
    const url = config?.url ?? ''
    const esRutaAuth = url.includes('/auth/login') || url.includes('/auth/refresh')

    if (error.response?.status !== 401 || !config || esRutaAuth) {
      return Promise.reject(error)
    }

    // El reintento con token recién renovado también fue rechazado: la sesión
    // no es recuperable. Sin esto la app quedaría "zombi" con un 401 permanente.
    if (config._reintentado) {
      expirarSesion()
      return Promise.reject(error)
    }

    // Sin sesión guardada no hay nada que renovar: dejar pasar el 401.
    if (!sesionStorage.leerRefreshToken()) return Promise.reject(error)

    try {
      refreshEnCurso ??= renovarToken().finally(() => {
        refreshEnCurso = null
      })
      const nuevoToken = await refreshEnCurso
      config._reintentado = true
      config.headers.Authorization = `Bearer ${nuevoToken}`
      return http(config)
    } catch {
      return Promise.reject(error)
    }
  },
)

/** Extrae el `Error` del contrato (codigo + mensaje) de cualquier fallo de axios. */
export function extraerApiError(err: unknown): ApiError | null {
  if (axios.isAxiosError<ApiError>(err) && err.response?.data && typeof err.response.data === 'object') {
    const d = err.response.data
    if (typeof d.codigo === 'string' && typeof d.mensaje === 'string') return d
  }
  return null
}

export function statusDe(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined
}

/** true cuando no hubo respuesta del servidor (red caída, timeout, CORS). */
export function esErrorDeRed(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response
}

/**
 * Mensaje apto para mostrar al usuario. Prioriza `mensaje` del contrato;
 * si no hay respuesta, describe la falla de conexión.
 */
export function mensajeDeError(err: unknown, porDefecto = 'Ocurrió un error inesperado.'): string {
  const api = extraerApiError(err)
  if (api) return api.mensaje
  if (esErrorDeRed(err)) return 'Sin conexión con el servidor.'
  return porDefecto
}

/**
 * Limpia query params: elimina undefined/null y serializa booleanos/números.
 * axios ya omite undefined, pero centralizarlo evita enviar "null" como texto.
 */
export function limpiarParams<T extends object>(params: T): Record<string, string | number | boolean> {
  const salida: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    salida[k] = v as string | number | boolean
  }
  return salida
}

export type RequestConfig = AxiosRequestConfig
