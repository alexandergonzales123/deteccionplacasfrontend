/**
 * Utilidades de placas. IMPORTANTE: la API SIEMPRE recibe la placa normalizada
 * (mayúsculas, sin guion ni espacios, ^[A-Z0-9]{6,8}$). El guion es solo
 * presentación.
 */

/**
 * Inserta el guion de presentación sobre una placa normalizada.
 * Regla simple acordada para esta fase:
 *   - 6 caracteres → `AAA-NNN`  (p. ej. AKQ198 → AKQ-198, autos)
 *   - 7 caracteres → `AAAA-NNN` (p. ej. AB5521X → AB55-21X)
 *   - cualquier otra longitud → sin guion
 * TODO(negocio): el formato real peruano tiene más variantes (motos `1234-AB`,
 * `A1-234`); si se necesita fidelidad total, esta regla debe refinarse.
 */
export function formatearPlaca(placaNormalizada: string | null | undefined): string {
  if (!placaNormalizada) return ''
  const p = placaNormalizada.trim().toUpperCase()
  if (p.length === 6) return `${p.slice(0, 3)}-${p.slice(3)}`
  if (p.length === 7) return `${p.slice(0, 4)}-${p.slice(4)}`
  return p
}

/** Normaliza lo que teclea un usuario para enviarlo a la API: mayúsculas, sin separadores. */
export function normalizarPlaca(entrada: string): string {
  return entrada.toUpperCase().replace(/[^A-Z0-9?*]/g, '')
}

export const PATRON_PLACA_NORMALIZADA = /^[A-Z0-9]{6,8}$/

export function esPlacaNormalizadaValida(placa: string): boolean {
  return PATRON_PLACA_NORMALIZADA.test(placa)
}
