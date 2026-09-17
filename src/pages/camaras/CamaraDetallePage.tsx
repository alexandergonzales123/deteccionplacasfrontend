/**
 * CU-08 · Vista previa de una cámara. GET /camaras/{id} (visor+) con polling
 * de 15 s; últimas detecciones con GET /detecciones?camaraId (operador+).
 * TODO(contrato): no existe endpoint de stream/preview (RTSP/WebRTC) ni de
 * reinicio remoto; se muestra un placeholder y se omite "Reiniciar cámara".
 */
import { useCallback, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CameraOff, ChevronRight, Pencil, Video, VideoOff, WifiOff } from 'lucide-react'
import * as camarasApi from '@/api/camaras'
import * as deteccionesApi from '@/api/detecciones'
import { mensajeDeError, statusDe } from '@/api/client'
import type { CamaraDetalle } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { tienePermiso } from '@/auth/permisos'
import { ChipConfianza } from '@/components/ChipConfianza'
import { TiempoRelativo } from '@/components/TiempoRelativo'
import { MapaAvistamientos } from '@/components/mapa/MapaAvistamientos'
import { Badge, Button, Card, CardBody, CardHeader, Chip, EmptyState, Skeleton } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { useReloj } from '@/hooks/useReloj'
import { PageHeader } from '@/layout/PageHeader'
import { cn } from '@/lib/cn'
import { formatoAbsoluto, formatoDuracion, segundosDesde } from '@/lib/fechas'
import { formatearPlaca } from '@/lib/placas'
import { ETIQUETA_ESTADO, TONO_ESTADO, etiquetaLente, formatoCoordenadas, UMBRAL_HEARTBEAT_SEG } from './estadoCamara'
import { FormularioCamaraModal } from './FormularioCamaraModal'

const INTERVALO_DETALLE_MS = 15_000
// Reloj grueso solo para lo derivado (heartbeat sano); los "hace X" llevan su propio reloj.
const INTERVALO_RELOJ_MS = 10_000
const LIMITE_DETECCIONES = 10

function Dato({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-fgMuted">{etiqueta}</dt>
      <dd className={cn('text-right text-sm text-fg', className)}>{children}</dd>
    </div>
  )
}

function textoTecnico(c: CamaraDetalle): string {
  const partes: string[] = []
  if (c.resolucion) partes.push(c.resolucion.replace(/x/i, '×'))
  if (c.fps !== undefined) partes.push(`${c.fps} fps`)
  return partes.join(' · ')
}

export function CamaraDetallePage() {
  const { camaraId = '' } = useParams<{ camaraId: string }>()
  const ahora = useReloj(INTERVALO_RELOJ_MS)
  const { usuario } = useAuth()
  const esAdmin = tienePermiso(usuario?.rol, 'admin')
  const esOperador = tienePermiso(usuario?.rol, 'operador')
  const [editando, setEditando] = useState(false)
  const cerrarEdicion = useCallback(() => setEditando(false), [])

  const camara = useQuery({
    queryKey: qk.camaras.detalle(camaraId),
    queryFn: () => camarasApi.obtenerCamara(camaraId),
    enabled: camaraId.length > 0,
    refetchInterval: INTERVALO_DETALLE_MS,
  })

  // GET /detecciones exige operador; un visor recibiría 403, así que no se llama.
  const detecciones = useQuery({
    queryKey: qk.detecciones.porCamara(camaraId, LIMITE_DETECCIONES),
    queryFn: () => deteccionesApi.listarDetecciones({ camaraId, limite: LIMITE_DETECCIONES }),
    enabled: esOperador && camaraId.length > 0,
    refetchInterval: INTERVALO_DETALLE_MS,
  })

  const c = camara.data
  const noEncontrada = camara.isError && statusDe(camara.error) === 404

  if (camara.isPending) {
    return (
      <>
        <PageHeader titulo="Vista previa" subtitulo="Cargando cámara…" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-[360px] lg:col-span-3" />
          <Skeleton className="h-[360px] lg:col-span-2" />
        </div>
      </>
    )
  }

  if (!c) {
    return (
      <>
        <PageHeader titulo="Vista previa" />
        <Card>
          <EmptyState
            icono={CameraOff}
            tono={noEncontrada ? 'advertencia' : 'error'}
            titulo={noEncontrada ? 'Cámara no encontrada' : 'No se pudo cargar la cámara'}
            descripcion={noEncontrada ? 'Puede haber sido dada de baja o el enlace es incorrecto.' : mensajeDeError(camara.error)}
            accion={
              <Button variante="secundario" className="min-h-[44px]" onClick={() => void camara.refetch()}>
                Reintentar
              </Button>
            }
          />
        </Card>
      </>
    )
  }

  const hb = c.ultimoHeartbeat
  const hbEn = hb?.enviadoEn ?? c.ultimoHeartbeatEn ?? null
  const segHb = segundosDesde(hbEn, ahora)
  const hbSano = segHb !== null && segHb < UMBRAL_HEARTBEAT_SEG
  const enCola = hb?.deteccionesEnCola ?? 0
  const tecnico = textoTecnico(c)

  return (
    <>
      <nav aria-label="Ruta" className="mb-3 flex items-center gap-1 text-xs text-fgMuted">
        <Link to="/camaras" className="inline-flex min-h-[44px] items-center hover:text-fg">
          Cámaras
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="text-fg">Vista previa</span>
      </nav>

      <PageHeader
        titulo={c.nombre}
        subtitulo={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Chip tono={TONO_ESTADO[c.estado]} punto>
              {ETIQUETA_ESTADO[c.estado]}
            </Chip>
            <span className="font-mono text-xs">{formatoCoordenadas(c.latitud, c.longitud)}</span>
          </span>
        }
        acciones={
          esAdmin ? (
            <Button variante="secundario" className="min-h-[44px]" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" aria-hidden />
              Editar cámara
            </Button>
          ) : null
        }
      />

      {camara.isError ? (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {mensajeDeError(camara.error, 'Sin conexión con el servidor.')} Se muestran los últimos datos recibidos.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader titulo="Vista previa en vivo" subtitulo={tecnico || undefined} />
            <CardBody>
              <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-app">
                {c.estado === 'inactiva' || !hbSano ? (
                  // CU-08 · 2a: estado de desconexión explícito, no un cuadro negro
                  // ambiguo. También cuando el heartbeat está vencido aunque el
                  // backend aún no haya marcado la cámara como inactiva (CA-11).
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-danger/[0.06] px-6 text-center">
                    <WifiOff className="h-8 w-8 text-danger" aria-hidden />
                    <p className="text-sm font-semibold text-fg">
                      {c.estado === 'inactiva' ? 'Cámara desconectada' : 'Sin heartbeat reciente'}
                    </p>
                    <p className="text-xs text-fgMuted">
                      {hbEn ? (
                        <>
                          Sin heartbeat desde <TiempoRelativo valor={hbEn} />{' '}
                          <span className="font-mono">({formatoAbsoluto(hbEn)})</span>
                        </>
                      ) : (
                        'Nunca ha reportado heartbeat.'
                      )}
                    </p>
                  </div>
                ) : (
                  // TODO(contrato): endpoint de stream/preview (RTSP/WebRTC) no definido.
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                    <VideoOff className="h-8 w-8 text-fgDim" aria-hidden />
                    <p className="text-sm font-semibold text-fgMuted">Vista previa no disponible en el MVP</p>
                    <p className="text-xs text-fgDim">El contrato v0.2.0 no expone un canal de video.</p>
                  </div>
                )}
                {tecnico ? (
                  <span className="absolute bottom-2 right-2 rounded bg-app/80 px-2 py-0.5 font-mono text-[11px] text-fgMuted">
                    {tecnico}
                  </span>
                ) : null}
              </div>
              {/* TODO(contrato): "Reiniciar cámara" del mockup no tiene endpoint; se omite. */}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              titulo="Últimas detecciones en esta cámara"
              subtitulo={esOperador ? `Últimas ${LIMITE_DETECCIONES} lecturas` : undefined}
            />
            {!esOperador ? (
              <EmptyState icono={Video} titulo="Requiere rol operador" descripcion="Su rol solo permite ver el estado de las cámaras." className="py-8" />
            ) : detecciones.isPending ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : detecciones.isError ? (
              <EmptyState icono={AlertTriangle} tono="error" titulo="No se pudieron cargar las detecciones" descripcion={mensajeDeError(detecciones.error)} className="py-8" />
            ) : detecciones.data.items.length === 0 ? (
              <EmptyState
                icono={Video}
                titulo="Sin detecciones recientes"
                // CA-11: la ausencia de detecciones no indica falla; el estado lo da el heartbeat.
                descripcion="La cámara puede estar operativa en una vía sin tránsito. Su estado se determina por el heartbeat, no por las detecciones."
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-border">
                {detecciones.data.items.map((d) => (
                  <li key={d.id} className="flex min-h-[44px] flex-wrap items-center gap-3 px-5 py-2.5">
                    <span className="font-mono text-base font-bold tracking-wider text-fg">{formatearPlaca(d.placaNormalizada)}</span>
                    <ChipConfianza confianza={d.confianza} />
                    {d.generoAlerta ? (
                      <Badge tono="danger" solido>
                        Alerta
                      </Badge>
                    ) : null}
                    <TiempoRelativo valor={d.capturadaEn} className="ml-auto font-mono text-xs text-fgMuted" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader titulo="Información de la cámara" />
            <CardBody className="py-2">
              <dl className="divide-y divide-border">
                <Dato etiqueta="Ubicación">{c.nombre}</Dato>
                <Dato etiqueta="Coordenadas" className="font-mono">
                  {formatoCoordenadas(c.latitud, c.longitud)}
                </Dato>
                <Dato etiqueta="Tipo de lente">
                  {etiquetaLente(c.tipoLente)}
                  {c.distanciaFocalMm !== undefined ? <span className="text-fgMuted"> · {c.distanciaFocalMm} mm</span> : null}
                </Dato>
                <Dato etiqueta="Resolución" className="font-mono">
                  {c.resolucion ? c.resolucion.replace(/x/i, '×') : '—'}
                </Dato>
                <Dato etiqueta="FPS" className="font-mono">
                  {c.fps ?? '—'}
                </Dato>
                <Dato etiqueta="Último heartbeat" className={cn('font-mono', hbEn ? (hbSano ? 'text-ok' : 'text-warn') : 'text-fgDim')}>
                  {hbEn ? <TiempoRelativo valor={hbEn} /> : 'sin heartbeat'}
                </Dato>
                <Dato etiqueta="Cola local del edge" className={cn('font-mono', enCola > 0 ? 'text-warn' : '')}>
                  {hb ? `${enCola} ${enCola === 1 ? 'pendiente' : 'pendientes'}` : '—'}
                </Dato>
                <Dato etiqueta="Uptime" className="font-mono">
                  {hb ? formatoDuracion(hb.uptimeSegundos) : '—'}
                </Dato>
                <Dato etiqueta="Almacenamiento libre" className="font-mono">
                  {hb?.almacenamientoLibreMb !== undefined ? `${hb.almacenamientoLibreMb.toLocaleString('es-PE')} MB` : '—'}
                </Dato>
                <Dato etiqueta="Temperatura" className="font-mono">
                  {hb?.temperaturaC !== undefined && hb.temperaturaC !== null ? `${hb.temperaturaC.toFixed(1)} °C` : '—'}
                </Dato>
                <Dato etiqueta="Versión del agente" className="font-mono">
                  {hb?.versionAgente ?? '—'}
                </Dato>
                <Dato etiqueta="Detecciones últimas 24 h" className="font-mono">
                  {c.deteccionesUltimas24h ?? '—'}
                </Dato>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader titulo="Ubicación en el mapa" />
            <div className="p-3">
              <MapaAvistamientos
                puntos={[{ id: c.id, lat: c.latitud, lng: c.longitud, orden: 1, esUltimo: true, etiqueta: c.nombre }]}
                className="h-[220px]"
                zoomPunto={16}
              />
            </div>
          </Card>
        </div>
      </div>

      {esAdmin && editando ? (
        <FormularioCamaraModal camara={c} onCerrar={cerrarEdicion} onActualizada={cerrarEdicion} />
      ) : null}
    </>
  )
}
