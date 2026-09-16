/**
 * Semáforo de confianza del OCR (mockup Panel en vivo):
 *   alta ≥ 90 % (verde) · media 80-89 % (ámbar) · baja < 80 % (rojo).
 * El nivel se calcula sobre el porcentaje REDONDEADO que ve el usuario, para
 * que "90%" sea siempre verde (0.895 redondea a 90 y no debe quedar ámbar).
 * El umbral por defecto del contrato para listar es 0.7 (`confianzaMinima`),
 * así que "baja" aquí significa "vale la pena revisar", no "descartada".
 */
export type NivelConfianza = 'alta' | 'media' | 'baja'

export function porcentajeEntero(confianza: number): number {
  return Math.round(confianza * 100)
}

export function nivelConfianza(confianza: number): NivelConfianza {
  const pct = porcentajeEntero(confianza)
  if (pct >= 90) return 'alta'
  if (pct >= 80) return 'media'
  return 'baja'
}

export function porcentajeConfianza(confianza: number): string {
  return `${porcentajeEntero(confianza)}%`
}
