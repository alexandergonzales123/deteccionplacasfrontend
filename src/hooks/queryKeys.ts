/** Claves de react-query centralizadas para poder invalidar por familia. */
import type { EstadoAlerta, EstadoCamara, MotivoWatchlist } from '@/api/types'

export interface FiltrosListaAlertas {
  estado?: EstadoAlerta
  desde?: string
  hasta?: string
}

export interface FiltrosListaWatchlist {
  motivo?: MotivoWatchlist
  activo: boolean
}

/** Filtros de GET /auditoria/consultas (todos opcionales en el contrato). */
export interface FiltrosAuditoria {
  usuarioId?: string
  placa?: string
  desde?: string
  hasta?: string
}

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
    /** Conteo del badge de la nav (GET /alertas?estado=nueva&limite=200). */
    nuevas: ['alertas', 'nuevas'] as const,
    /** Listado paginado por cursor con los filtros del contrato. */
    lista: (f: FiltrosListaAlertas) =>
      ['alertas', 'lista', f.estado ?? 'todas', f.desde ?? '', f.hasta ?? ''] as const,
    detalle: (alertaId: string) => ['alertas', 'detalle', alertaId] as const,
  },
  watchlist: {
    todas: ['watchlist'] as const,
    /** Conteo de la stat card del panel (activo=true, limite=200). */
    activas: ['watchlist', 'activas'] as const,
    /** Todas las entradas activas (varias páginas) para cruzar una placa en campo (CU-12). */
    activasCompleta: ['watchlist', 'activas', 'completa'] as const,
    lista: (f: FiltrosListaWatchlist) => ['watchlist', 'lista', f.motivo ?? 'todos', f.activo] as const,
  },
  auditoria: {
    todas: ['auditoria'] as const,
    /** Listado paginado por cursor (GET /auditoria/consultas). Sin polling: consulta administrativa. */
    lista: (f: FiltrosAuditoria) =>
      ['auditoria', 'lista', f.usuarioId ?? '', f.placa ?? '', f.desde ?? '', f.hasta ?? ''] as const,
  },
}
