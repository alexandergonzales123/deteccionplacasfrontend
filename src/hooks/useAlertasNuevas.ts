/**
 * Conteo de alertas en estado `nueva`. Lo comparten el badge del sidebar y la
 * stat card del panel (misma clave → una sola petición cada 30 s).
 *
 * TODO(contrato): no hay endpoint de conteo; se lista con `limite=200` (máximo
 * del contrato) y se cuenta en cliente. Si viene `siguienteCursor`, hay más de
 * 200 y se muestra "99+"/"200+".
 */
import { useQuery } from '@tanstack/react-query'
import * as alertasApi from '@/api/alertas'
import { useAuth } from '@/auth/AuthContext'
import { tienePermiso } from '@/auth/permisos'
import { qk } from './queryKeys'

export const LIMITE_CONTEO = 200

export interface Conteo {
  cantidad: number
  /** true si el listado tiene más páginas: la cantidad es un piso, no el total. */
  truncado: boolean
}

export function useAlertasNuevas() {
  const { usuario } = useAuth()
  // GET /alertas exige rol operador; un visor recibiría 403.
  const habilitado = tienePermiso(usuario?.rol, 'operador')

  return useQuery({
    queryKey: qk.alertas.nuevas,
    queryFn: async (): Promise<Conteo> => {
      const pagina = await alertasApi.listarAlertas({ estado: 'nueva', limite: LIMITE_CONTEO })
      return { cantidad: pagina.items.length, truncado: Boolean(pagina.siguienteCursor) }
    },
    enabled: habilitado,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
}

/** "0", "17", "99+" para el badge de la nav. */
export function textoBadge(conteo: Conteo | undefined): string | null {
  if (!conteo || conteo.cantidad === 0) return null
  if (conteo.truncado || conteo.cantidad > 99) return '99+'
  return String(conteo.cantidad)
}
