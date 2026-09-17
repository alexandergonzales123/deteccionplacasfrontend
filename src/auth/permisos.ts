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

/** Valida contra el enum antes de indexar (un valor como "toString" no debe resolver al prototipo). */
export function esRol(v: string | null | undefined): v is Rol {
  return v !== null && v !== undefined && Object.prototype.hasOwnProperty.call(JERARQUIA, v)
}

export function tienePermiso(rol: Rol | null | undefined, rolMinimo: Rol): boolean {
  // Un rol fuera del enum (backend desalineado) no tiene permiso alguno.
  if (!esRol(rol)) return false
  return JERARQUIA[rol] >= JERARQUIA[rolMinimo]
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  visor: 'Visor',
  operador: 'Operador',
  supervisor: 'Supervisor',
  admin: 'Administrador',
}

/** Etiqueta legible del rol; "desconocido" si viene fuera del enum del contrato. */
export function etiquetaRol(rol: Rol | string | null | undefined): string {
  return esRol(rol) ? ETIQUETA_ROL[rol] : 'desconocido'
}
