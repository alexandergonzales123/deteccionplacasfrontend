/**
 * Control de acceso por rol (RF-14, CA-08), según el schema `Rol` del contrato:
 *   visor < operador < supervisor < admin
 * Cada rol hereda lo del anterior. Es solo una capa de UX: el backend
 * responde 403 por su cuenta; la UI evita mostrar lo que va a fallar.
 */
import type { Rol } from '@/api/types'

const JERARQUIA: Record<Rol, number> = {
  visor: 0,
  operador: 1,
  supervisor: 2,
  admin: 3,
}

export function tienePermiso(rol: Rol | null | undefined, rolMinimo: Rol): boolean {
  if (!rol) return false
  const nivel = JERARQUIA[rol]
  // Un rol fuera del enum (backend desalineado) no tiene permiso alguno.
  if (nivel === undefined) return false
  return nivel >= JERARQUIA[rolMinimo]
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  visor: 'Visor',
  operador: 'Operador',
  supervisor: 'Supervisor',
  admin: 'Administrador',
}

/** Etiqueta legible del rol; "desconocido" si viene fuera del enum del contrato. */
export function etiquetaRol(rol: Rol | string | null | undefined): string {
  return (rol && ETIQUETA_ROL[rol as Rol]) || 'desconocido'
}
