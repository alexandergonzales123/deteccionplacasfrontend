/**
 * CU-06 · Alertas. GET /alertas (operador+) paginado por cursor, filtrado por
 * `estado`, `desde` y `hasta` (todos en la URL). Polling de 15 s solo en la
 * pestaña "Nuevas"; el contador de esa pestaña es el mismo del badge de la nav.
 */
import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Bell, BellOff } from 'lucide-react'
import * as alertasApi from '@/api/alertas'
import { mensajeDeError } from '@/api/client'
import type { EstadoAlerta } from '@/api/types'
import { Button, Card, EmptyState, Input, Skeleton } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { useAlertasNuevas } from '@/hooks/useAlertasNuevas'
import { PageHeader } from '@/layout/PageHeader'
import { cn } from '@/lib/cn'
import { aFecha } from '@/lib/fechas'
import { AlertaCard } from './AlertaCard'

const INTERVALO_NUEVAS_MS = 15_000
const LIMITE_PAGINA = 50

/** Pestañas: `?estado=nueva|revisada|descartada`; `?estado=todas` sin filtro. Por defecto, Nuevas. */
type Pestana = EstadoAlerta | 'todas'
const PESTANAS: readonly Pestana[] = ['nueva', 'revisada', 'descartada', 'todas']
const ETIQUETA_PESTANA: Record<Pestana, string> = {
  nueva: 'Nuevas',
  revisada: 'Revisadas',
  descartada: 'Descartadas',
  todas: 'Todas',
}

const VACIO: Record<Pestana, { titulo: string; descripcion: string }> = {
  nueva: { titulo: 'No hay alertas nuevas', descripcion: 'Las detecciones que coincidan con el watchlist aparecerán aquí.' },
  revisada: { titulo: 'No hay alertas revisadas', descripcion: 'Las alertas atendidas por los operadores aparecerán aquí.' },
  descartada: { titulo: 'No hay alertas descartadas', descripcion: 'Los falsos positivos descartados aparecerán aquí.' },
  todas: { titulo: 'No hay alertas', descripcion: 'Las detecciones que coincidan con el watchlist aparecerán aquí.' },
}

function esPestana(v: string | null): v is Pestana {
  return v !== null && (PESTANAS as readonly string[]).includes(v)
}

/** Rango validado como en Búsqueda: fechas inválidas se ignoran; desde > hasta invalida ambas. */
function rangoISO(desde: string, hasta: string): { desde?: string; hasta?: string; error?: string } {
  const d = desde ? aFecha(desde) : null
  const h = hasta ? aFecha(hasta) : null
  if ((desde && !d) || (hasta && !h)) return { error: 'Fecha inválida.' }
  if (d && h && d.getTime() > h.getTime()) return { error: '"Desde" debe ser anterior a "Hasta".' }
  return { desde: d?.toISOString(), hasta: h?.toISOString() }
}

export function AlertasPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const pestana: Pestana = esPestana(searchParams.get('estado')) ? (searchParams.get('estado') as Pestana) : 'nueva'
  const desdeLocal = searchParams.get('desde') ?? ''
  const hastaLocal = searchParams.get('hasta') ?? ''
  const rango = useMemo(() => rangoISO(desdeLocal, hastaLocal), [desdeLocal, hastaLocal])

  const estado: EstadoAlerta | undefined = pestana === 'todas' ? undefined : pestana
  const filtros = { estado, desde: rango.desde, hasta: rango.hasta }

  const nuevas = useAlertasNuevas()

  const lista = useInfiniteQuery({
    queryKey: qk.alertas.lista(filtros),
    queryFn: ({ pageParam }) => alertasApi.listarAlertas({ ...filtros, limite: LIMITE_PAGINA, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.siguienteCursor ?? undefined,
    // Solo la bandeja de nuevas se refresca sola; el histórico no cambia por sí mismo.
    refetchInterval: pestana === 'nueva' ? INTERVALO_NUEVAS_MS : false,
  })

  const items = useMemo(() => lista.data?.pages.flatMap((p) => p.items) ?? [], [lista.data])

  function actualizarParams(cambios: Partial<Record<'estado' | 'desde' | 'hasta', string>>) {
    const next: Record<string, string> = {}
    const e = cambios.estado ?? pestana
    const d = cambios.desde ?? desdeLocal
    const h = cambios.hasta ?? hastaLocal
    if (e !== 'nueva') next.estado = e
    if (d) next.desde = d
    if (h) next.hasta = h
    setSearchParams(next, { replace: true })
  }

  const textoNuevas = nuevas.data ? ` · ${nuevas.data.cantidad}${nuevas.data.truncado ? '+' : ''}` : ''
  const vacio = VACIO[pestana]

  return (
    <>
      <PageHeader
        titulo="Alertas"
        subtitulo="Coincidencias entre detecciones y la lista de vigilancia"
        acciones={
          <div role="tablist" aria-label="Filtrar por estado" className="flex flex-wrap gap-1">
            {PESTANAS.map((p) => {
              const activa = pestana === p
              return (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  onClick={() => actualizarParams({ estado: p })}
                  className={cn(
                    'min-h-[44px] rounded-md px-3 text-xs font-semibold transition-colors',
                    activa ? 'bg-primary/15 text-primary' : 'text-fgMuted hover:bg-panelHover hover:text-fg',
                    p === 'nueva' && !activa && nuevas.data && nuevas.data.cantidad > 0 && 'text-danger',
                  )}
                >
                  {ETIQUETA_PESTANA[p]}
                  {p === 'nueva' ? textoNuevas : ''}
                </button>
              )
            })}
          </div>
        }
      />

      <Card className="mb-6">
        <form
          onSubmit={(e) => e.preventDefault()}
          noValidate
          className="grid gap-4 px-5 py-4 md:grid-cols-12 md:items-start"
          aria-label="Filtrar por fecha"
        >
          <div className="md:col-span-3">
            <Input
              label="Desde"
              type="datetime-local"
              value={desdeLocal}
              max={hastaLocal || undefined}
              onChange={(e) => actualizarParams({ desde: e.target.value })}
              error={rango.error}
              className="min-h-[44px]"
            />
          </div>
          <div className="md:col-span-3">
            <Input
              label="Hasta"
              type="datetime-local"
              value={hastaLocal}
              min={desdeLocal || undefined}
              onChange={(e) => actualizarParams({ hasta: e.target.value })}
              className="min-h-[44px]"
            />
          </div>
          {desdeLocal || hastaLocal ? (
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-transparent md:block" aria-hidden>
                Limpiar
              </span>
              <Button type="button" variante="secundario" tamano="lg" className="min-h-[44px]" onClick={() => actualizarParams({ desde: '', hasta: '' })}>
                Limpiar rango
              </Button>
            </div>
          ) : null}
        </form>
      </Card>

      {lista.isError ? (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {mensajeDeError(lista.error, 'No se pudieron cargar las alertas.')}
          {lista.data ? <span className="text-fgMuted"> Se muestran los últimos datos recibidos.</span> : null}
        </div>
      ) : null}

      {lista.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          {lista.isError ? (
            // Solo la pestaña Nuevas tiene polling; en las demás el reintento es manual.
            <EmptyState
              icono={BellOff}
              tono="error"
              titulo="No se pudieron cargar las alertas"
              descripcion={pestana === 'nueva' ? 'Se reintentará automáticamente.' : 'Vuelva a intentarlo.'}
              accion={
                pestana !== 'nueva' ? (
                  <Button variante="secundario" className="min-h-[44px]" onClick={() => void lista.refetch()} cargando={lista.isFetching}>
                    Reintentar
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              icono={pestana === 'nueva' ? Bell : BellOff}
              titulo={rango.desde || rango.hasta ? `${vacio.titulo} en el periodo seleccionado` : vacio.titulo}
              descripcion={vacio.descripcion}
            />
          )}
        </Card>
      ) : (
        <ul className="space-y-3" aria-label={`Alertas: ${ETIQUETA_PESTANA[pestana].toLowerCase()}`}>
          {items.map((a) => (
            <li key={a.id}>
              <AlertaCard alerta={a} />
            </li>
          ))}
        </ul>
      )}

      {lista.hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <Button variante="secundario" className="min-h-[44px]" onClick={() => void lista.fetchNextPage()} cargando={lista.isFetchingNextPage}>
            Cargar más
          </Button>
        </div>
      ) : null}
    </>
  )
}
