/**
 * CU-12 · consulta en campo: placa + motivo → ¿está en vigilancia? y ¿cuándo
 * fue vista por última vez? Se ejecuta SOLO al pulsar Consultar (auditada).
 *
 * En paralelo:
 *  - GET /placas/buscar?patron&difusa=false&motivo → `enWatchlist` y avistamientos.
 *  - GET /placas/{placa}/ubicacion-actual?motivo → 404 = sin avistamientos.
 *  - GET /watchlist?activo=true (cacheado 60 s) → motivo y expediente de la
 *    vigilancia, cruzando `placaNormalizada` en cliente.
 *
 * TODO(contrato): /placas/buscar debería devolver motivo y expediente de la
 * coincidencia en watchlist para evitar la segunda llamada. Además, sus
 * candidatas salen de las detecciones: una placa vigilada que ninguna cámara
 * ha leído aún no aparece, por eso el watchlist se cruza SIEMPRE y no solo
 * cuando `enWatchlist === true`.
 */
import type { QueryClient } from '@tanstack/react-query'
import * as placasApi from '@/api/placas'
import * as watchlistApi from '@/api/watchlist'
import { statusDe } from '@/api/client'
import type { CandidataPlaca, UbicacionActual, WatchlistItem } from '@/api/types'
import { qk } from '@/hooks/queryKeys'

const LIMITE_PAGINA = 200
const MAX_PAGINAS = 5
const FRESCURA_WATCHLIST_MS = 60_000

export interface ParametrosCampo {
  /** Placa normalizada (^[A-Z0-9]{6,8}$). */
  placa: string
  motivo: string
}

/** 'desconocida' cuando no se pudo verificar: la UI NUNCA muestra "sin vigilancia" en ese caso. */
export type Vigilancia = 'si' | 'no' | 'desconocida'

export interface ResultadoCampo {
  placa: string
  vigilancia: Vigilancia
  /** Entradas activas del watchlist para la placa (puede haber varias: CU-05 1a). */
  entradas: WatchlistItem[]
  /** Coincidencia exacta de /placas/buscar; null si no hay registros de la placa. */
  candidata: CandidataPlaca | null
  /**
   * 'sin_avistamientos' SOLO ante 404 del contrato; 'no_disponible' ante
   * cualquier otro fallo (500, timeout, red): la UI no afirma nada por omisión.
   */
  ubicacion: UbicacionActual | 'sin_avistamientos' | 'no_disponible'
}

interface WatchlistActiva {
  items: WatchlistItem[]
  /** Se alcanzó el tope de páginas: la lista puede estar incompleta. */
  truncada: boolean
}

async function cargarWatchlistActiva(): Promise<WatchlistActiva> {
  const items: WatchlistItem[] = []
  let cursor: string | undefined
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const res = await watchlistApi.listarWatchlist({ activo: true, limite: LIMITE_PAGINA, cursor })
    items.push(...res.items)
    if (!res.siguienteCursor) return { items, truncada: false }
    cursor = res.siguienteCursor
  }
  return { items, truncada: true }
}

function mensajeCorto(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function consultarCampo(p: ParametrosCampo, queryClient: QueryClient): Promise<ResultadoCampo> {
  const [candidatas, ubicacion, watchlist] = await Promise.all([
    placasApi.buscarPlacas({ patron: p.placa, difusa: false, motivo: p.motivo }),
    placasApi.obtenerUbicacionActual(p.placa, p.motivo).catch((err: unknown): 'sin_avistamientos' | 'no_disponible' => {
      // 404: sin avistamientos en el periodo retenido. Otro fallo no tumba la consulta,
      // pero se distingue para que la UI no lo presente como "sin avistamientos".
      // Solo status y mensaje: el AxiosError completo incluye cabeceras (bearer), placa y motivo.
      if (statusDe(err) === 404) return 'sin_avistamientos'
      console.warn('ubicacion-actual no disponible', statusDe(err) ?? 'sin respuesta', mensajeCorto(err))
      return 'no_disponible'
    }),
    queryClient
      .fetchQuery({ queryKey: qk.watchlist.activasCompleta, queryFn: cargarWatchlistActiva, staleTime: FRESCURA_WATCHLIST_MS })
      .catch((err: unknown) => {
        console.warn('watchlist no disponible', statusDe(err) ?? 'sin respuesta', mensajeCorto(err))
        return null
      }),
  ])

  const candidata =
    candidatas.find((c) => c.placaNormalizada === p.placa) ?? candidatas.find((c) => c.coincidenciaExacta) ?? null
  const entradas = watchlist ? watchlist.items.filter((w) => w.activo && w.placaNormalizada === p.placa) : []

  let vigilancia: Vigilancia
  if (entradas.length > 0 || candidata?.enWatchlist === true) {
    vigilancia = 'si'
  } else if (candidata?.enWatchlist === false) {
    // /placas/buscar conoce la placa y afirma que no está vigilada.
    vigilancia = 'no'
  } else if (watchlist && !watchlist.truncada) {
    // Lista completa y la placa no figura.
    vigilancia = 'no'
  } else {
    vigilancia = 'desconocida'
  }

  return { placa: p.placa, vigilancia, entradas, candidata, ubicacion }
}

/** CU-03 · 3a aplicado a campo: placas a distancia 1 cuando no hay registros de la exacta. */
export async function buscarSimilares(p: ParametrosCampo): Promise<CandidataPlaca[]> {
  const candidatas = await placasApi.buscarPlacas({ patron: p.placa, difusa: true, distanciaMaxima: 1, motivo: p.motivo })
  return candidatas.filter((c) => c.placaNormalizada !== p.placa)
}
