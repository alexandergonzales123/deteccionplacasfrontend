/**
 * Listado completo de cámaras para la pantalla de Cámaras (CU-09).
 * TODO(contrato): GET /camaras no devuelve conteo total; se pagina por cursor
 * con limite=200 hasta agotar, con un tope de 5 páginas (1000 cámaras) para
 * no bloquear el panel. Si se alcanza el tope, `truncado` = true.
 */
import { useQuery } from '@tanstack/react-query'
import * as camarasApi from '@/api/camaras'
import type { Camara, EstadoCamara } from '@/api/types'
import { qk } from '@/hooks/queryKeys'

const LIMITE_PAGINA = 200
const MAX_PAGINAS = 5

export interface CamarasCompletas {
  items: Camara[]
  truncado: boolean
}

export async function listarTodasLasCamaras(estado?: EstadoCamara): Promise<CamarasCompletas> {
  const items: Camara[] = []
  let cursor: string | undefined
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const res = await camarasApi.listarCamaras({ estado, limite: LIMITE_PAGINA, cursor })
    items.push(...res.items)
    if (!res.siguienteCursor) return { items, truncado: false }
    cursor = res.siguienteCursor
  }
  return { items, truncado: true }
}

export function useCamarasCompletas(estado: EstadoCamara | undefined, intervaloMs: number) {
  return useQuery({
    queryKey: qk.camaras.completa(estado),
    queryFn: () => listarTodasLasCamaras(estado),
    refetchInterval: intervaloMs,
  })
}
