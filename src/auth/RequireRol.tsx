/**
 * Bloquea el contenido si el rol del usuario no alcanza `minimo` (CA-08).
 * Como ruta (sin children) renderiza <Outlet/>; como envoltorio, sus children.
 * Si no alcanza, redirige a la pantalla de inicio del rol; solo si el rol no
 * tiene ninguna ruta permitida muestra el aviso de acceso restringido.
 */
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import type { Rol } from '@/api/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { rutaInicioPorRol } from '@/layout/navegacion'
import { useAuth } from './AuthContext'
import { etiquetaRol, tienePermiso } from './permisos'

interface Props {
  minimo: Rol
  children?: ReactNode
  /** Si es true, no renderiza nada en lugar de redirigir (para ocultar botones). */
  silencioso?: boolean
}

export function RequireRol({ minimo, children, silencioso = false }: Props) {
  const { usuario } = useAuth()
  const location = useLocation()

  if (!tienePermiso(usuario?.rol, minimo)) {
    if (silencioso) return null

    const inicio = rutaInicioPorRol(usuario?.rol)
    // Evita un bucle si la propia ruta de inicio es la que rechaza.
    if (inicio && inicio !== location.pathname) return <Navigate to={inicio} replace />

    return (
      <EmptyState
        icono={ShieldOff}
        titulo="Acceso restringido"
        descripcion={`Esta sección requiere rol ${etiquetaRol(minimo)} o superior. Su rol actual es ${etiquetaRol(
          usuario?.rol,
        )}.`}
      />
    )
  }
  return children !== undefined ? <>{children}</> : <Outlet />
}
