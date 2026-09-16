/**
 * CU-02 · Monitorear el flujo en vivo (RF-03, CA-01).
 * Feed: GET /detecciones con el umbral de confianza por defecto del servidor,
 * refresco cada 5 s. Sin endpoint de estadísticas agregadas en el contrato,
 * las stat cards se aproximan con listados acotados (ver comentarios).
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Bell, Camera, CameraOff, CarFront, ShieldAlert } from 'lucide-react'
import * as camarasApi from '@/api/camaras'
import * as deteccionesApi from '@/api/detecciones'
import * as watchlistApi from '@/api/watchlist'
import { mensajeDeError } from '@/api/client'
import { Card, CardHeader, EmptyState } from '@/components/ui'
import { LIMITE_CONTEO, useAlertasNuevas } from '@/hooks/useAlertasNuevas'
import { qk } from '@/hooks/queryKeys'
import { useReloj } from '@/hooks/useReloj'
import { PageHeader } from '@/layout/PageHeader'
import { cn } from '@/lib/cn'
import { claveDia, inicioDeDiaISO } from '@/lib/fechas'
import { BannerDesconexion } from './BannerDesconexion'
import { StatCard } from './StatCard'
import { TablaDetecciones, TablaDeteccionesSkeleton } from './TablaDetecciones'

const LIMITE_FEED = 50
const INTERVALO_FEED_MS = 5_000
const INTERVALO_STATS_MS = 60_000

function textoConteo(cantidad: number, truncado: boolean): string {
  return truncado ? `${cantidad}+` : String(cantidad)
}

export function PanelEnVivoPage() {
  const ahora = useReloj(1000)

  // ---- Feed de detecciones recientes -------------------------------------
  const feed = useQuery({
    queryKey: qk.detecciones.feed(LIMITE_FEED),
    queryFn: () => deteccionesApi.listarDetecciones({ limite: LIMITE_FEED }),
    refetchInterval: INTERVALO_FEED_MS,
    // Ante error react-query conserva la última página buena y se avisa (CU-02 · 4a).
    // El retry es el global de main.tsx (excluye 401/403/404).
  })

  // ---- Cámaras: activas / total, en mantenimiento ------------------------
  // TODO(contrato): sin conteo agregado; se lista hasta 200 (máximo). Con más
  // cámaras el total sería un piso.
  const camaras = useQuery({
    queryKey: qk.camaras.lista,
    queryFn: () => camarasApi.listarCamaras({ limite: LIMITE_CONTEO }),
    refetchInterval: INTERVALO_STATS_MS,
  })

  // ---- Detecciones de hoy ------------------------------------------------
  // TODO(contrato): no existe endpoint de estadísticas agregadas. Se consulta
  // `desde=<hoy 00:00 local>` con limite=200 y se cuenta en cliente; si hay
  // `siguienteCursor` se muestra "200+". Es una aproximación aceptada para el MVP.
  const dia = claveDia(ahora)
  const desdeHoy = useMemo(() => inicioDeDiaISO(dia), [dia])
  const hoy = useQuery({
    queryKey: qk.detecciones.hoy(desdeHoy),
    queryFn: () => deteccionesApi.listarDetecciones({ desde: desdeHoy, limite: LIMITE_CONTEO }),
    refetchInterval: INTERVALO_STATS_MS,
  })

  // ---- Alertas nuevas (misma query que el badge del sidebar) -------------
  const alertas = useAlertasNuevas()

  // ---- Placas en watchlist ----------------------------------------------
  const watchlist = useQuery({
    queryKey: qk.watchlist.activas,
    queryFn: () => watchlistApi.listarWatchlist({ activo: true, limite: LIMITE_CONTEO }),
    refetchInterval: INTERVALO_STATS_MS,
  })

  // ---- Derivados -----------------------------------------------------------
  const resumenCamaras = useMemo(() => {
    const items = camaras.data?.items ?? []
    return {
      total: items.length,
      activas: items.filter((c) => c.estado === 'activa').length,
      mantenimiento: items.filter((c) => c.estado === 'mantenimiento').length,
      inactivas: items.filter((c) => c.estado === 'inactiva').length,
      truncado: Boolean(camaras.data?.siguienteCursor),
    }
  }, [camaras.data])

  // Se recalcula por minuto, no por segundo (`ahora` cambia cada segundo).
  const minutoActual = Math.floor(ahora.getTime() / 60_000)
  const resumenHoy = useMemo(() => {
    const items = hoy.data?.items ?? []
    const truncado = Boolean(hoy.data?.siguienteCursor)
    // "+N en la última hora" del mockup, calculado en cliente sobre la muestra
    // (viene ordenada de más reciente a más antigua).
    const haceUnaHora = minutoActual * 60_000 - 3_600_000
    const ultimaHora = items.filter((d) => new Date(d.capturadaEn).getTime() >= haceUnaHora).length
    // Si la muestra está truncada y toda ella cae en la última hora, el conteo es un piso.
    const ultimaHoraTruncada = truncado && ultimaHora === items.length
    return { total: items.length, truncado, ultimaHora, ultimaHoraTruncada }
  }, [hoy.data, minutoActual])

  const detecciones = feed.data?.items ?? []
  const feedConError = feed.isError
  const sinCamarasOperativas = camaras.isSuccess && resumenCamaras.activas === 0
  const estadoEnVivo = feedConError ? 'error' : feed.isSuccess ? 'ok' : 'inactivo'

  return (
    <>
      <PageHeader
        titulo="Panel en vivo"
        subtitulo="Flujo de detecciones de la red de cámaras municipal"
        enVivo={estadoEnVivo}
      />

      {feedConError ? (
        <BannerDesconexion
          ultimoDatoEn={feed.dataUpdatedAt}
          ahora={ahora}
          mensaje={mensajeDeError(feed.error, 'Sin conexión con el servidor')}
          reintentando={feed.isFetching}
          onReintentar={() => void feed.refetch()}
        />
      ) : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen">
        <StatCard
          etiqueta="Detecciones hoy"
          icono={CarFront}
          tono="primary"
          cargando={hoy.isPending}
          error={hoy.isError}
          valor={textoConteo(resumenHoy.total, resumenHoy.truncado)}
          detalle={`${textoConteo(resumenHoy.ultimaHora, resumenHoy.ultimaHoraTruncada)} en la última hora`}
        />
        <StatCard
          etiqueta="Cámaras activas"
          icono={Camera}
          tono={sinCamarasOperativas ? 'danger' : 'ok'}
          cargando={camaras.isPending}
          error={camaras.isError}
          valor={
            <>
              {resumenCamaras.activas}
              <span className="text-fgDim"> / {textoConteo(resumenCamaras.total, resumenCamaras.truncado)}</span>
            </>
          }
          detalle={
            resumenCamaras.mantenimiento > 0
              ? `${resumenCamaras.mantenimiento} en mantenimiento`
              : resumenCamaras.inactivas > 0
                ? `${resumenCamaras.inactivas} inactivas`
                : 'Toda la red operativa'
          }
        />
        <StatCard
          etiqueta="Alertas nuevas"
          icono={Bell}
          tono={(alertas.data?.cantidad ?? 0) > 0 ? 'danger' : 'muted'}
          cargando={alertas.isPending}
          error={alertas.isError}
          valor={textoConteo(alertas.data?.cantidad ?? 0, alertas.data?.truncado ?? false)}
          detalle="Pendientes de revisión"
        />
        <StatCard
          etiqueta="Placas en watchlist"
          icono={ShieldAlert}
          tono="warn"
          cargando={watchlist.isPending}
          error={watchlist.isError}
          valor={textoConteo(watchlist.data?.items.length ?? 0, Boolean(watchlist.data?.siguienteCursor))}
          detalle="Con vigilancia activa"
        />
      </section>

      <Card>
        <CardHeader
          titulo="Detecciones recientes"
          subtitulo={`Últimas ${LIMITE_FEED} lecturas de la red`}
          acciones={
            <span
              className={cn(
                'inline-flex items-center gap-2 text-xs font-medium',
                feedConError ? 'text-danger' : 'text-ok',
              )}
            >
              <span
                className={cn('h-1.5 w-1.5 rounded-full bg-current', !feedConError && 'animate-pulseDot')}
                aria-hidden
              />
              {feedConError ? 'Datos desactualizados' : 'Actualizando en tiempo real'}
            </span>
          }
        />

        {feed.isPending ? (
          <TablaDeteccionesSkeleton />
        ) : detecciones.length > 0 ? (
          <TablaDetecciones detecciones={detecciones} ahora={ahora} />
        ) : feedConError ? (
          <EmptyState
            icono={Activity}
            tono="error"
            titulo="No se pudieron cargar las detecciones"
            descripcion="El servidor no respondió. Se reintentará automáticamente."
          />
        ) : sinCamarasOperativas ? (
          // CU-02 · flujo 3a: distinguir "no hay tránsito" de "no hay cámaras operativas".
          <EmptyState
            icono={CameraOff}
            tono="advertencia"
            titulo="No hay cámaras operativas"
            descripcion={
              resumenCamaras.total === 0
                ? 'Aún no hay cámaras registradas en el sistema.'
                : `Las ${resumenCamaras.total} cámaras registradas están inactivas o en mantenimiento. No se recibirán detecciones hasta que al menos una vuelva a reportar.`
            }
          />
        ) : (
          <EmptyState
            icono={Activity}
            titulo="Sin tránsito reciente"
            descripcion="Las cámaras están operativas pero no han reportado lecturas de placa en el periodo."
          />
        )}
      </Card>
    </>
  )
}
