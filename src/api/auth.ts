/** Tag `Auth` del contrato. */
import { http } from './client'
import type { LoginRequest, LoginResponse, RefreshRequest, Usuario } from './types'

/** POST /auth/login (security: []). 401 credenciales inválidas · 429 bloqueo temporal. */
export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/login', body)
  return data
}

/** POST /auth/refresh (security: []). */
export async function refresh(body: RefreshRequest): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/refresh', body)
  return data
}

/** POST /auth/logout → 204. Invalida el refresh token en el servidor. */
export async function logout(): Promise<void> {
  await http.post('/auth/logout')
}

/** GET /auth/yo. */
export async function yo(): Promise<Usuario> {
  const { data } = await http.get<Usuario>('/auth/yo')
  return data
}
