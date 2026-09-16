/**
 * Ítems del sidebar con el rol mínimo que exige el backend para su pantalla
 * (tomado de las descripciones "Rol mínimo:" del contrato). Si el rol no
 * alcanza, el ítem no se muestra: evita llevar al usuario a un 403.
 */
import { Activity, Bell, Camera, ClipboardList, Search, ShieldAlert, type LucideIcon } from 'lucide-react'
import type { Rol } from '@/api/types'
import { tienePermiso } from '@/auth/permisos'

export interface ItemNav {
  ruta: string
  etiqueta: string
  icono: LucideIcon
  rolMinimo: Rol
  /** Muestra el badge de alertas nuevas. */
  conBadgeAlertas?: boolean
}

export const ITEMS_NAV: ItemNav[] = [
  // GET /detecciones: operador. Un visor ve solo cámaras y retención.
  { ruta: '/', etiqueta: 'Panel en vivo', icono: Activity, rolMinimo: 'operador' },
  { ruta: '/busqueda', etiqueta: 'Búsqueda por placa', icono: Search, rolMinimo: 'operador' },
  { ruta: '/camaras', etiqueta: 'Cámaras', icono: Camera, rolMinimo: 'visor' },
  // GET /watchlist: operador (la edición exige supervisor; se resuelve dentro de la página).
  { ruta: '/watchlist', etiqueta: 'Watchlist', icono: ShieldAlert, rolMinimo: 'operador' },
  { ruta: '/alertas', etiqueta: 'Alertas', icono: Bell, rolMinimo: 'operador', conBadgeAlertas: true },
  { ruta: '/auditoria', etiqueta: 'Auditoría', icono: ClipboardList, rolMinimo: 'admin' },
]

/**
 * Primera ruta de la nav permitida para el rol (p. ej. visor → /camaras).
 * Es la pantalla de inicio tras login y el destino cuando el rol no alcanza
 * para la ruta solicitada. Devuelve null si no hay ninguna permitida.
 */
export function rutaInicioPorRol(rol: Rol | null | undefined): string | null {
  return ITEMS_NAV.find((i) => tienePermiso(rol, i.rolMinimo))?.ruta ?? null
}
