/**
 * CU-06 · paso 1: el operador abre la alerta y revisa placa, evidencia, cámara
 * y hora. GET /alertas/{id}; la evidencia va embebida (GET /detecciones/{id}/imagen,
 * auditada). Las acciones son las mismas de la card del listado.
 */
import { type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, BellOff, ChevronRight } from 'lucide-react'
import * as alertasApi from '@/api/alertas'
import { mensajeDeError, statusDe } from '@/api/client'
import { BadgeEstadoAlerta } from '@/components/BadgeEstadoAlerta'
import { ChipConfianza } from '@/components/ChipConfianza'
import { ChipMotivo } from '@/components/ChipMotivo'
import { EvidenciaDeteccion } from '@/components/EvidenciaDeteccion'
import { MapaAvistamientos } from '@/components/mapa/MapaAvistamientos'
import { Button, Card, CardBody, CardHeader, EmptyState, Skeleton } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { PageHeader } from '@/layout/PageHeader'
import { cn } from '@/lib/cn'
import { formatoAbsoluto } from '@/lib/fechas'
import { formatearPlaca } from '@/lib/placas'
import { AlertaCard } from './AlertaCard'

function Dato({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-fgMuted">{etiqueta}</dt>
      <dd className={cn('min-w-0 text-right text-sm text-fg', className)}>{children}</dd>
    </div>
  )
}

export function AlertaDetallePage() {
  const { alertaId = '' } = useParams<{ alertaId: string }>()

  const alerta = useQuery({
    queryKey: qk.alertas.detalle(alertaId),
    queryFn: () => alertasApi.obtenerAlerta(alertaId),
    enabled: alertaId.length > 0,
  })

  const a = alerta.data
  const noEncontrada = alerta.isError && statusDe(alerta.error) === 404

  const migas = (
    <nav aria-label="Ruta" className="mb-3 flex items-center gap-1 text-xs text-fgMuted">
      <Link to="/alertas" className="inline-flex min-h-[44px] items-center hover:text-fg">
        Alertas
      </Link>
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      <span className="text-fg">Detalle</span>
    </nav>
  )

  if (alerta.isPending) {
    return (
      <>
        {migas}
        <PageHeader titulo="Alerta" subtitulo="Cargando…" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-[360px] lg:col-span-3" />
          <Skeleton className="h-[360px] lg:col-span-2" />
        </div>
      </>
    )
  }

  if (!a) {
    return (
      <>
        {migas}
        <PageHeader titulo="Alerta" />
        <Card>
          <EmptyState
            icono={BellOff}
            tono={noEncontrada ? 'advertencia' : 'error'}
            titulo={noEncontrada ? 'Alerta no encontrada' : 'No se pudo cargar la alerta'}
            descripcion={noEncontrada ? 'Puede haber sido purgada por retención o el enlace es incorrecto.' : mensajeDeError(alerta.error)}
            accion={
              noEncontrada ? (
                <Link to="/alertas" className="inline-flex min-h-[44px] items-center text-sm text-primary hover:underline">
                  Volver a alertas
                </Link>
              ) : (
                <Button variante="secundario" className="min-h-[44px]" onClick={() => void alerta.refetch()}>
                  Reintentar
                </Button>
              )
            }
          />
        </Card>
      </>
    )
  }

  const d = a.deteccion
  const placaCoincide = d.placaNormalizada === a.placaNormalizada

  return (
    <>
      {migas}
      <PageHeader
        titulo={`Alerta · ${formatearPlaca(a.placaNormalizada)}`}
        subtitulo={
          <span className="inline-flex flex-wrap items-center gap-2">
            <BadgeEstadoAlerta estado={a.estado} />
            <ChipMotivo motivo={a.motivoWatchlist} />
            <span className="font-mono text-xs">{formatoAbsoluto(a.creadaEn)}</span>
          </span>
        }
      />

      {alerta.isError ? (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {mensajeDeError(alerta.error, 'Sin conexión con el servidor.')} Se muestran los últimos datos recibidos.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <AlertaCard alerta={a} variante="detalle" />

          <Card>
            <CardHeader titulo="Evidencia" subtitulo="Recorte de la placa capturado por la cámara. La descarga queda registrada en auditoría." />
            <CardBody>
              {/* R-05: la confirmación humana se hace sobre esta imagen, nunca sobre el texto del OCR. */}
              <EvidenciaDeteccion deteccion={d} className="max-h-[60vh]" />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader titulo="Detección" />
            <CardBody className="py-2">
              <dl className="divide-y divide-border">
                <Dato etiqueta="Placa leída (OCR)" className="font-mono">
                  {d.placa}
                </Dato>
                <Dato etiqueta="Placa normalizada" className={cn('font-mono font-bold', !placaCoincide && 'text-warn')}>
                  {formatearPlaca(d.placaNormalizada)}
                  {!placaCoincide ? (
                    <span className="block text-xs font-normal text-warn">Difiere de la vigilada ({formatearPlaca(a.placaNormalizada)})</span>
                  ) : null}
                </Dato>
                <Dato etiqueta="Confianza">
                  <ChipConfianza confianza={d.confianza} />
                </Dato>
                <Dato etiqueta="Capturada en" className="font-mono">
                  {formatoAbsoluto(d.capturadaEn)}
                </Dato>
                <Dato etiqueta="Recibida en" className="font-mono">
                  {d.recibidaEn ? formatoAbsoluto(d.recibidaEn) : '—'}
                </Dato>
                <Dato etiqueta="Cámara">
                  <Link to={`/camaras/${encodeURIComponent(d.camara.id)}`} className="inline-flex min-h-[44px] items-center text-primary hover:underline">
                    {d.camara.nombre}
                  </Link>
                </Dato>
                <Dato etiqueta="Alerta creada" className="font-mono">
                  {formatoAbsoluto(a.creadaEn)}
                </Dato>
                <Dato etiqueta="Atendida por">
                  {a.atendidaPor?.nombre ?? '—'}
                </Dato>
                <Dato etiqueta="Atendida en" className="font-mono">
                  {a.atendidaEn ? formatoAbsoluto(a.atendidaEn) : '—'}
                </Dato>
                <Dato etiqueta="Entrada de watchlist" className="font-mono text-xs text-fgMuted">
                  {/* TODO(contrato): no hay GET /watchlist/{id}; se muestra el identificador sin enlace. */}
                  {a.watchlistId ?? '—'}
                </Dato>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader titulo="Ubicación de la cámara" />
            <div className="p-3">
              <MapaAvistamientos
                puntos={[{ id: d.camara.id, lat: d.camara.latitud, lng: d.camara.longitud, orden: 1, esUltimo: true, etiqueta: d.camara.nombre }]}
                className="h-[220px]"
                zoomPunto={16}
              />
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
