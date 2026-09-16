/** Tag `Watchlist` del contrato (CU-05). */
import { http, limpiarParams } from './client'
import type { MotivoWatchlist, Pagina, ParamsPaginacion, WatchlistItem, WatchlistItemInput } from './types'

export interface ParamsListarWatchlist extends ParamsPaginacion {
  motivo?: MotivoWatchlist
  /** Default true en el servidor. */
  activo?: boolean
}

/** GET /watchlist · rol mínimo: operador. */
export async function listarWatchlist(params: ParamsListarWatchlist = {}): Promise<Pagina<WatchlistItem>> {
  const { data } = await http.get<Pagina<WatchlistItem>>('/watchlist', { params: limpiarParams(params) })
  return data
}

/**
 * POST /watchlist · rol mínimo: supervisor.
 * Una placa puede figurar varias veces con motivos distintos; cada entrada tiene su `id`.
 */
export async function agregarAWatchlist(body: WatchlistItemInput): Promise<WatchlistItem> {
  const { data } = await http.post<WatchlistItem>('/watchlist', body)
  return data
}

/** DELETE /watchlist/{watchlistId} · rol mínimo: supervisor. Baja lógica. */
export async function retirarDeWatchlist(watchlistId: string): Promise<void> {
  await http.delete(`/watchlist/${encodeURIComponent(watchlistId)}`)
}
