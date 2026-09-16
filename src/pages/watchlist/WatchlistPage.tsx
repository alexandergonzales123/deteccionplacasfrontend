/**
 * CU-05 · Lista de vigilancia. GET /watchlist (operador+) paginado por cursor,
 * con polling suave de 60 s; alta y retiro solo para supervisor+. El retiro es
 * una baja lógica (DELETE /watchlist/{id}): las alertas ya generadas conservan
 * su vínculo con la entrada.
 */
import { useCallback, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Lock, ShieldAlert, ShieldOff, Trash2 } from 'lucide-react'
import * as watchlistApi from '@/api/watchlist'
import { mensajeDeError } from '@/api/client'
import type { MotivoWatchlist, WatchlistItem } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { tienePermiso } from '@/auth/permisos'
import { ChipMotivo } from '@/components/ChipMotivo'
import { Button, Card, CardHeader, Chip, EmptyState, Modal, Select, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { useReloj } from '@/hooks/useReloj'
import { PageHeader } from '@/layout/PageHeader'
import { cn } from '@/lib/cn'
import { formatoAbsolutoCorto, formatoFechaCorta, formatoHastaRelativo } from '@/lib/fechas'
import { formatearPlaca } from '@/lib/placas'
import { ETIQUETA_MOTIVO, esMotivoWatchlist, estaVencida, MOTIVOS_WATCHLIST } from '@/lib/watchlist'
import { FormularioWatchlist } from './FormularioWatchlist'

const INTERVALO_LISTA_MS = 60_000
// Reloj grueso para "vence en" y "Vencida"; basta con el minuto.
const INTERVALO_RELOJ_MS = 60_000
const LIMITE_PAGINA = 50

export function WatchlistPage() {
  const ahora = useReloj(INTERVALO_RELOJ_MS)
  const { usuario } = useAuth()
  const esSupervisor = tienePermiso(usuario?.rol, 'supervisor')
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // Filtros del contrato en la URL: `motivo` y `activo` (default true).
  const motivoParam = searchParams.get('motivo')
  const motivo: MotivoWatchlist | undefined = esMotivoWatchlist(motivoParam) ? motivoParam : undefined
  const activo = searchParams.get('activo') !== 'false'

  const lista = useInfiniteQuery({
    queryKey: qk.watchlist.lista({ motivo, activo }),
    queryFn: ({ pageParam }) => watchlistApi.listarWatchlist({ motivo, activo, limite: LIMITE_PAGINA, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.siguienteCursor ?? undefined,
    refetchInterval: INTERVALO_LISTA_MS,
  })

  const items = useMemo(() => lista.data?.pages.flatMap((p) => p.items) ?? [], [lista.data])

  const [aRetirar, setARetirar] = useState<WatchlistItem | null>(null)
  const retirar = useMutation({
    mutationFn: (id: string) => watchlistApi.retirarDeWatchlist(id),
    onSuccess: () => {
      setARetirar(null)
      void queryClient.invalidateQueries({ queryKey: qk.watchlist.todas })
    },
  })
  const retirando = retirar.isPending
  const { reset: resetRetirar } = retirar
  // Al abrir se limpia el error de un intento anterior sobre otra entrada.
  const abrirRetiro = useCallback(
    (w: WatchlistItem) => {
      resetRetirar()
      setARetirar(w)
    },
    [resetRetirar],
  )
  const cerrarRetiro = useCallback(() => {
    if (!retirando) setARetirar(null)
  }, [retirando])

  function cambiarFiltros(cambios: { motivo?: MotivoWatchlist | ''; activo?: boolean }) {
    const next: Record<string, string> = {}
    const m = cambios.motivo !== undefined ? cambios.motivo : (motivo ?? '')
    const a = cambios.activo !== undefined ? cambios.activo : activo
    if (m) next.motivo = m
    if (!a) next.activo = 'false'
    setSearchParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader
        titulo="Watchlist"
        subtitulo="Placas vigiladas que generan alertas al ser detectadas"
        acciones={
          !esSupervisor ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-fgMuted">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Solo un supervisor puede agregar placas
            </span>
          ) : null
        }
      />

      {esSupervisor ? <FormularioWatchlist /> : null}

      {lista.isError ? (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {mensajeDeError(lista.error, 'No se pudo cargar el watchlist.')}
          {lista.data ? <span className="text-fgMuted"> Se muestran los últimos datos recibidos.</span> : null}
        </div>
      ) : null}

      <Card>
        <CardHeader
          titulo={activo ? 'Placas vigiladas' : 'Placas retiradas'}
          subtitulo={
            lista.data
              ? `${items.length}${lista.hasNextPage ? '+' : ''} ${items.length === 1 && !lista.hasNextPage ? 'entrada' : 'entradas'}${motivo ? ` · ${ETIQUETA_MOTIVO[motivo].toLowerCase()}` : ''}`
              : undefined
          }
          className="flex-col sm:flex-row sm:items-center"
          acciones={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Filtrar por motivo"
                value={motivo ?? ''}
                onChange={(e) => cambiarFiltros({ motivo: e.target.value as MotivoWatchlist | '' })}
                className="min-w-[180px]"
              >
                <option value="">Todos los motivos</option>
                {MOTIVOS_WATCHLIST.map((m) => (
                  <option key={m} value={m}>
                    {ETIQUETA_MOTIVO[m]}
                  </option>
                ))}
              </Select>
              <div role="tablist" aria-label="Filtrar por vigencia" className="flex gap-1">
                {([true, false] as const).map((a) => (
                  <button
                    key={String(a)}
                    type="button"
                    role="tab"
                    aria-selected={activo === a}
                    onClick={() => cambiarFiltros({ activo: a })}
                    className={cn(
                      'min-h-[44px] rounded-md px-3 text-xs font-semibold transition-colors',
                      activo === a ? 'bg-primary/15 text-primary' : 'text-fgMuted hover:bg-panelHover hover:text-fg',
                    )}
                  >
                    {a ? 'Activas' : 'Retiradas'}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {lista.isPending ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          lista.isError ? (
            <EmptyState icono={ShieldOff} tono="error" titulo="No se pudo cargar el watchlist" descripcion="Se reintentará automáticamente." />
          ) : (
            <EmptyState
              icono={ShieldAlert}
              titulo={activo ? 'No hay placas en vigilancia' : 'No hay placas retiradas'}
              descripcion={
                motivo
                  ? `Ninguna entrada con motivo "${ETIQUETA_MOTIVO[motivo].toLowerCase()}".`
                  : activo && esSupervisor
                    ? 'Agregue la primera placa con el formulario superior.'
                    : activo
                      ? 'Un supervisor debe agregar las placas a vigilar.'
                      : undefined
              }
            />
          )
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Placa</Th>
                <Th>Motivo</Th>
                <Th>Expediente</Th>
                <Th>Notas</Th>
                <Th>Vence</Th>
                <Th>Agregado por</Th>
                <Th>Fecha</Th>
                {esSupervisor ? <Th className="text-right">Acciones</Th> : null}
              </tr>
            </THead>
            <TBody>
              {items.map((w) => {
                const vencida = estaVencida(w, ahora)
                return (
                  <Tr key={w.id} className={cn('hover:bg-panelHover', !w.activo && 'opacity-60')}>
                    <Td className="whitespace-nowrap">
                      {/* Sin motivo en la URL: el operador lo declara en Búsqueda (CA-04). */}
                      <Link
                        to={`/busqueda?placa=${encodeURIComponent(w.placaNormalizada)}`}
                        className="inline-flex min-h-[44px] items-center font-mono text-base font-bold tracking-wider text-fg hover:text-primary"
                        title="Buscar avistamientos de esta placa"
                      >
                        {formatearPlaca(w.placaNormalizada)}
                      </Link>
                    </Td>
                    <Td>
                      <ChipMotivo motivo={w.motivo} />
                    </Td>
                    <Td className="font-mono text-xs text-fgMuted">{w.referenciaExpediente}</Td>
                    <Td className="max-w-[220px]">
                      {w.notas ? (
                        <span className="block truncate text-fgMuted" title={w.notas}>
                          {w.notas}
                        </span>
                      ) : (
                        <span className="text-fgDim">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">
                      {!w.venceEn ? (
                        <span className="text-fgDim">—</span>
                      ) : vencida ? (
                        // CU-05 · 3a: la entrada ya no genera alertas (CA-07).
                        <Chip tono="muted" title={`Venció el ${formatoAbsolutoCorto(w.venceEn)}`}>
                          Vencida
                        </Chip>
                      ) : (
                        <time dateTime={w.venceEn} title={formatoAbsolutoCorto(w.venceEn)} className="text-fgMuted">
                          {formatoHastaRelativo(w.venceEn, ahora)}
                        </time>
                      )}
                    </Td>
                    <Td className="text-fgMuted">{w.agregadoPor?.nombre ?? '—'}</Td>
                    <Td className="whitespace-nowrap font-mono text-xs text-fgMuted">
                      <time dateTime={w.agregadoEn} title={formatoAbsolutoCorto(w.agregadoEn)}>
                        {formatoFechaCorta(w.agregadoEn)}
                      </time>
                    </Td>
                    {esSupervisor ? (
                      <Td className="text-right">
                        {w.activo ? (
                          <button
                            type="button"
                            onClick={() => abrirRetiro(w)}
                            aria-label={`Retirar ${formatearPlaca(w.placaNormalizada)} de la vigilancia`}
                            title="Retirar de la vigilancia"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-fgMuted hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        ) : (
                          <span className="text-xs text-fgDim">Retirada</span>
                        )}
                      </Td>
                    ) : null}
                  </Tr>
                )
              })}
            </TBody>
          </Table>
        )}

        {lista.hasNextPage ? (
          <div className="flex justify-center border-t border-border px-5 py-3">
            <Button variante="secundario" className="min-h-[44px]" onClick={() => void lista.fetchNextPage()} cargando={lista.isFetchingNextPage}>
              Cargar más
            </Button>
          </div>
        ) : null}
      </Card>

      {esSupervisor ? (
        <Modal
          abierto={aRetirar !== null}
          onCerrar={cerrarRetiro}
          titulo="Retirar de la vigilancia"
          descripcion={
            aRetirar ? `${formatearPlaca(aRetirar.placaNormalizada)} · ${ETIQUETA_MOTIVO[aRetirar.motivo] ?? aRetirar.motivo}` : undefined
          }
          tamano="sm"
          pie={
            <>
              <Button variante="secundario" className="min-h-[44px]" onClick={cerrarRetiro} disabled={retirando}>
                Cancelar
              </Button>
              <Button variante="peligro" className="min-h-[44px]" cargando={retirando} onClick={() => aRetirar && retirar.mutate(aRetirar.id)}>
                Retirar
              </Button>
            </>
          }
        >
          <p className="text-sm text-fg">
            Es una baja lógica; las alertas ya generadas conservan su vínculo con esta entrada. La placa dejará de generar alertas nuevas.
          </p>
          {retirar.isError ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {mensajeDeError(retirar.error, 'No se pudo retirar la entrada.')}
            </p>
          ) : null}
        </Modal>
      ) : null}
    </>
  )
}
