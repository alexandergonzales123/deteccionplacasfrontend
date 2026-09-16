/** "Juan Carlos Pérez" → "JP". Para el avatar del sidebar. */
export function iniciales(nombre: string | null | undefined): string {
  if (!nombre) return '?'
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primera = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : ''
  return (primera + ultima).toUpperCase()
}
