/** Claves de react-query centralizadas para poder invalidar por familia. */
export const qk = {
  detecciones: {
    todas: ['detecciones'] as const,
    feed: (limite: number) => ['detecciones', 'feed', limite] as const,
    hoy: (desdeISO: string) => ['detecciones', 'hoy', desdeISO] as const,
  },
  camaras: {
    todas: ['camaras'] as const,
    lista: ['camaras', 'lista'] as const,
  },
  alertas: {
    todas: ['alertas'] as const,
    nuevas: ['alertas', 'nuevas'] as const,
  },
  watchlist: {
    todas: ['watchlist'] as const,
    activas: ['watchlist', 'activas'] as const,
  },
}
