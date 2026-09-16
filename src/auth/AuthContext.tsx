/**
 * Sesión del panel (transversal, CA-08). Guarda `token`, `refreshToken` y
 * `usuario` en localStorage vía `sesionStorage`, y reacciona al evento de
 * sesión expirada que emite el interceptor de axios cuando el refresh falla.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as authApi from '@/api/auth'
import { EVENTO_SESION_EXPIRADA } from '@/api/client'
import type { LoginRequest, Usuario } from '@/api/types'
import { sesionStorage, type Sesion } from './sesionStorage'

interface AuthContextValue {
  usuario: Usuario | null
  token: string | null
  refreshToken: string | null
  autenticado: boolean
  /** Resuelve con el usuario autenticado (útil para decidir la ruta de inicio por rol). */
  login: (credenciales: LoginRequest) => Promise<Usuario>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => sesionStorage.leer())
  const queryClient = useQueryClient()

  const limpiarSesion = useCallback(() => {
    sesionStorage.limpiar()
    setSesion(null)
    // Nada de lo cacheado debe sobrevivir a un cambio de usuario.
    queryClient.clear()
  }, [queryClient])

  const login = useCallback(async (credenciales: LoginRequest) => {
    const respuesta = await authApi.login(credenciales)
    sesionStorage.guardar(respuesta)
    queryClient.clear()
    setSesion({ token: respuesta.token, refreshToken: respuesta.refreshToken, usuario: respuesta.usuario })
    return respuesta.usuario
  }, [queryClient])

  const logout = useCallback(async () => {
    try {
      // POST /auth/logout invalida el refresh token en el servidor. Si falla
      // (p. ej. sin red), igual se cierra la sesión local.
      await authApi.logout()
    } catch {
      /* ignorado a propósito */
    } finally {
      limpiarSesion()
    }
  }, [limpiarSesion])

  // El interceptor no conoce React: avisa por evento cuando el refresh falla.
  useEffect(() => {
    const alExpirar = () => limpiarSesion()
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar)
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar)
  }, [limpiarSesion])

  // Sincroniza pestañas: cerrar sesión en una cierra en todas.
  useEffect(() => {
    const alCambiarStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('centinela.')) setSesion(sesionStorage.leer())
    }
    window.addEventListener('storage', alCambiarStorage)
    return () => window.removeEventListener('storage', alCambiarStorage)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario: sesion?.usuario ?? null,
      token: sesion?.token ?? null,
      refreshToken: sesion?.refreshToken ?? null,
      autenticado: sesion !== null,
      login,
      logout,
    }),
    [sesion, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
