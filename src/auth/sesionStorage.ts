/**
 * Persistencia de la sesión en localStorage. Es el único lugar que conoce las
 * claves; lo usan tanto AuthContext como el interceptor de axios (que no puede
 * depender de React).
 */
import type { LoginResponse, Usuario } from '@/api/types'

const CLAVES = {
  token: 'centinela.token',
  refreshToken: 'centinela.refreshToken',
  usuario: 'centinela.usuario',
} as const

export interface Sesion {
  token: string
  refreshToken: string
  usuario: Usuario
}

function leerUsuario(): Usuario | null {
  const crudo = localStorage.getItem(CLAVES.usuario)
  if (!crudo) return null
  try {
    const u = JSON.parse(crudo) as Usuario
    return u && typeof u.id === 'string' && typeof u.rol === 'string' ? u : null
  } catch {
    return null
  }
}

export const sesionStorage = {
  leerToken: (): string | null => localStorage.getItem(CLAVES.token),
  leerRefreshToken: (): string | null => localStorage.getItem(CLAVES.refreshToken),
  leerUsuario,

  leer(): Sesion | null {
    const token = this.leerToken()
    const refreshToken = this.leerRefreshToken()
    const usuario = leerUsuario()
    return token && refreshToken && usuario ? { token, refreshToken, usuario } : null
  },

  guardar(r: LoginResponse): void {
    localStorage.setItem(CLAVES.token, r.token)
    localStorage.setItem(CLAVES.refreshToken, r.refreshToken)
    localStorage.setItem(CLAVES.usuario, JSON.stringify(r.usuario))
  },

  limpiar(): void {
    Object.values(CLAVES).forEach((k) => localStorage.removeItem(k))
  },
}
