/**
 * Tipos derivados 1:1 de `openapi-anpr-mvp.yaml` v0.2.0 (components.schemas).
 * Los nombres de campo son EXACTAMENTE los del contrato. No agregar campos
 * que el backend no devuelva; si el contrato cambia, este archivo cambia con él.
 */

// ------------------------------------------------------------------ Error ----

export interface ApiError {
  codigo: string
  mensaje: string
  detalles?: Record<string, unknown>
}

// ------------------------------------------------------------------- Auth ----

/** Jerarquía de menor a mayor: visor < operador < supervisor < admin. */
export type Rol = 'admin' | 'supervisor' | 'operador' | 'visor'

export interface Usuario {
  id: string
  nombre: string
  email?: string
  rol: Rol
  activo?: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken: string
  /** Segundos de vigencia del token de acceso. */
  expiraEn: number
  usuario: Usuario
}

export interface RefreshRequest {
  refreshToken: string
}

// ---------------------------------------------------------------- Cámaras ----

export type EstadoCamara = 'activa' | 'inactiva' | 'mantenimiento'

export type TipoLente = 'fijo' | 'varifocal'

/** Referencia compacta de cámara, embebida en cada detección. */
export interface CamaraRef {
  id: string
  nombre: string
  latitud: number
  longitud: number
}

export interface Camara extends CamaraRef {
  estado: EstadoCamara
  tipoLente?: TipoLente
  distanciaFocalMm?: number
  resolucion?: string
  fps?: number
  ultimoHeartbeatEn?: string | null
  creadaEn?: string
}

export interface HeartbeatInput {
  enviadoEn: string
  uptimeSegundos: number
  ultimaCapturaEn?: string | null
  /** Detecciones pendientes en el buffer local del edge. */
  deteccionesEnCola?: number
  almacenamientoLibreMb?: number
  temperaturaC?: number | null
  versionAgente?: string
}

export interface CamaraDetalle extends Camara {
  ultimoHeartbeat?: HeartbeatInput
  deteccionesUltimas24h?: number
}

export interface CamaraInput {
  nombre: string
  latitud: number
  longitud: number
  estado?: EstadoCamara
  tipoLente?: TipoLente
  distanciaFocalMm?: number
  resolucion?: string
  fps?: number
}

/** Respuesta de `POST /camaras`: incluye la apiKey del edge por única vez. */
export interface CamaraCreada extends Camara {
  apiKey?: string
}

// ------------------------------------------------------------ Detecciones ----

export interface DeteccionInput {
  eventoUuid: string
  camaraId: string
  /** Texto crudo leído por el OCR. */
  placa: string
  confianza: number
  /** Reloj del dispositivo edge. */
  capturadaEn: string
}

/** Esquema único para una lectura de placa (unifica Deteccion y Avistamiento). */
export interface Deteccion {
  id: string
  /** Texto crudo del OCR, p. ej. "AKQ-198". */
  placa: string
  /** Mayúsculas, sin separadores. Es la clave de búsqueda, p. ej. "AKQ198". */
  placaNormalizada: string
  confianza: number
  capturadaEn: string
  recibidaEn?: string
  camara: CamaraRef
  /** Apunta a `/detecciones/{id}/imagen`; null si fue purgada. */
  imagenUrl?: string | null
  generoAlerta: boolean
  alertaId?: string | null
}

export interface PaginaDetecciones {
  items: Deteccion[]
  siguienteCursor?: string | null
}

// ----------------------------------------------------------------- Placas ----

export interface CandidataPlaca {
  placaNormalizada: string
  /** Distancia de edición respecto al patrón consultado (0 = exacta). */
  distancia: number
  coincidenciaExacta: boolean
  avistamientos: number
  ultimoAvistamientoEn?: string
  enWatchlist?: boolean
}

/**
 * reciente: < 5 min · probable: 5-60 min · antiguo: > 60 min.
 * El cliente debe degradar visualmente la certeza conforme baja la frescura (CA-06).
 */
export type Frescura = 'reciente' | 'probable' | 'antiguo'

export interface UbicacionActual {
  avistamiento: Deteccion
  antiguedadSegundos: number
  frescura: Frescura
  advertencia?: string
}

// -------------------------------------------------------------- Watchlist ----

export type MotivoWatchlist = 'robado' | 'requisitoriado' | 'moroso_papeletas' | 'orden_judicial' | 'otro'

export interface WatchlistItemInput {
  placa: string
  motivo: MotivoWatchlist
  notas?: string
  /** Denuncia, oficio u orden que respalda la vigilancia. */
  referenciaExpediente: string
  venceEn?: string | null
}

export interface WatchlistItem extends WatchlistItemInput {
  id: string
  placaNormalizada: string
  activo: boolean
  agregadoEn: string
  agregadoPor?: Usuario
}

// ---------------------------------------------------------------- Alertas ----

export type EstadoAlerta = 'nueva' | 'revisada' | 'descartada'

export interface Alerta {
  id: string
  placaNormalizada: string
  motivoWatchlist?: MotivoWatchlist
  watchlistId?: string
  deteccion: Deteccion
  estado: EstadoAlerta
  comentario?: string | null
  creadaEn: string
  atendidaPor?: Usuario
  atendidaEn?: string | null
}

export interface CambioEstadoAlertaInput {
  estado: EstadoAlerta
  comentario?: string
}

// -------------------------------------------------------------- Auditoría ----

export type AccionAuditoria =
  | 'busqueda_placa'
  | 'consulta_avistamientos'
  | 'consulta_ubicacion_actual'
  | 'descarga_imagen'
  | 'exportacion'
  | 'alta_watchlist'
  | 'baja_watchlist'
  | 'cambio_estado_alerta'
  | 'cambio_retencion'

export interface RegistroAuditoria {
  id: string
  usuario: Usuario
  accion: AccionAuditoria
  placaConsultada?: string | null
  motivo?: string | null
  ipOrigen?: string
  realizadaEn: string
}

// ---------------------------------------------------------- Configuración ----

export interface PoliticaRetencionInput {
  diasDeteccionesSinAlerta: number
  diasDeteccionesConAlerta: number
  diasImagenes: number
  diasAuditoria?: number
}

export interface PoliticaRetencion extends PoliticaRetencionInput {
  actualizadaEn?: string
  actualizadaPor?: Usuario
  ultimaPurgaEn?: string | null
  registrosPurgadosUltimaEjecucion?: number
}

// ------------------------------------------------------------- Paginación ----

/** Forma común de todos los listados paginados por cursor del contrato. */
export interface Pagina<T> {
  items: T[]
  siguienteCursor?: string | null
}

/** Parámetros `Limite` (1..200, default 50) y `Cursor` del contrato. */
export interface ParamsPaginacion {
  limite?: number
  cursor?: string
}
