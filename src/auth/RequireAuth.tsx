/** Ruta protegida: sin sesión redirige a /login conservando el destino. */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RequireAuth() {
  const { autenticado } = useAuth()
  const location = useLocation()
  if (!autenticado) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  }
  return <Outlet />
}
