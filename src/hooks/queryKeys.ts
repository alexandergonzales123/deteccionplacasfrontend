/** Claves de react-query centralizadas para poder invalidar por familia. */
import type { EstadoCamara } from '@/api/types'

export const qk = {
  detecciones: {
    todas: ['detecciones'] as const,
    feed: (limite: number) => ['detecciones', 'feed', limite] as const,
    hoy: (desdeISO: string) => ['detecciones', 'hoy', desdeISO] as const,
    porCamara: (camaraId: string, limite: number) => ['detecciones', 'camara', camaraId, limite] as const,
  },
  camaras: {
    todas: ['camaras'] as const,
    lista: ['camaras', 'lista'] as const,
    /** Listado completo (todas las páginas) para la pantalla de cámaras. */
    completa: (estado: EstadoCamara | undefined) => ['camaras', 'completa', estado ?? 'todas'] as const,
    detalle: (camaraId: string) => ['camaras', 'detalle', camaraId] as const,
  },
  // Las consultas de placas (CU-03/CU-04) no se cachean: van por useMutation
  // porque cada ejecución queda auditada (CA-04). Por eso no hay claves aquí.
  configuracion: {
    retencion: ['configuracion', 'retencion'] as const,
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
