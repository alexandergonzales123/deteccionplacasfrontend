/**
 * Card de una alerta (listado y detalle). Contiene sus propias acciones y los
 * modales de evidencia / cambio de estado, para que listado y detalle se
 * comporten igual (CU-06):
 *  - nueva: Ver evidencia · Descartar · Marcar revisada
 *  - revisada / descartada: Reabrir (solo supervisor+, flujo 3a)
 */
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Image as ImagenIcono, MapPin, RotateCcw } from 'lucide-react'
import type { Alerta } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { tienePermiso } from '@/auth/permisos'
import { BadgeEstadoAlerta } from '@/components/BadgeEstadoAlerta'
import { ChipConfianza } from '@/components/ChipConfianza'
import { ChipMotivo } from '@/components/ChipMotivo'
import { TiempoRelativo } from '@/components/TiempoRelativo'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatoAbsoluto, formatoAbsolutoCorto } from '@/lib/fechas'
import { formatearPlaca } from '@/lib/placas'
import { ModalEvidencia } from '@/pages/busqueda/ModalEvidencia'
import { ModalAccionAlerta, type AccionAlerta } from './ModalAccionAlerta'

interface Props {
  alerta: Alerta
  /** `detalle`: placa sin enlace, tipografía mayor y sin "Ver evidencia" (la evidencia va embebida en la página). */
  variante?: 'lista' | 'detalle'
}

export function AlertaCard({ alerta, variante = 'lista' }: Props) {
  const { usuario } = useAuth()
  const esSupervisor = tienePermiso(usuario?.rol, 'supervisor')
  const [evidenciaAbierta, setEvidenciaAbierta] = useState(false)
  const [accion, setAccion] = useState<AccionAlerta | null>(null)

  // Callbacks estables para los modales (ver nota en Modal.tsx).
  const cerrarEvidencia = useCallback(() => setEvidenciaAbierta(false), [])
  const cerrarAccion = useCallback(() => setAccion(null), [])

  const d = alerta.deteccion
  const esDetalle = variante === 'detalle'
  const placa = formatearPlaca(alerta.placaNormalizada)
  const rutaDetalle = `/alertas/${encodeURIComponent(alerta.id)}`
  const sinImagen = d.imagenUrl === null
  const atendida = alerta.estado !== 'nueva'

  return (
    <article
      aria-label={`Alerta ${placa}`}
      className={cn(
        'rounded-lg border bg-panel p-4 transition-colors sm:p-5',
        alerta.estado === 'nueva' ? 'border-danger/60 bg-danger/[0.04]' : 'border-border',
        alerta.estado === 'descartada' && 'opacity-60 hover:opacity-100',
      )}
    >
      <div className="flex gap-4">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md',
            esDetalle ? 'h-14 w-14' : 'h-11 w-11',
            alerta.estado === 'nueva' ? 'bg-danger/15 text-danger' : 'bg-panelHover text-fgMuted',
          )}
          aria-hidden
        >
          <Car className={esDetalle ? 'h-7 w-7' : 'h-5 w-5'} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {esDetalle ? (
              <span className="font-mono text-3xl font-bold tracking-wider text-fg">{placa}</span>
            ) : (
              <Link
                to={rutaDetalle}
                className="inline-flex min-h-[44px] items-center font-mono text-2xl font-bold tracking-wider text-fg hover:text-primary"
              >
                {placa}
              </Link>
            )}
            <ChipMotivo motivo={alerta.motivoWatchlist} />
            <BadgeEstadoAlerta estado={alerta.estado} />
            <ChipConfianza confianza={d.confianza} />
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-fgMuted">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-fgDim" aria-hidden />
            <span className="text-fg">{d.camara.nombre}</span>
            <span aria-hidden>·</span>
            {esDetalle ? (
              <TiempoRelativo valor={alerta.creadaEn} className="font-mono text-xs" />
            ) : (
              <Link to={rutaDetalle} className="inline-flex min-h-[44px] items-center hover:text-fg" title={formatoAbsoluto(alerta.creadaEn)}>
                <TiempoRelativo valor={alerta.creadaEn} className="font-mono text-xs" />
              </Link>
            )}
            {atendida ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  {alerta.estado === 'revisada' ? 'revisada' : 'descartada'} por{' '}
                  <span className="text-fg">{alerta.atendidaPor?.nombre ?? '—'}</span>
                  {alerta.atendidaEn ? (
                    <>
                      {' '}
                      <time dateTime={alerta.atendidaEn} className="font-mono text-xs">
                        {formatoAbsolutoCorto(alerta.atendidaEn)}
                      </time>
                    </>
                  ) : null}
                </span>
              </>
            ) : null}
          </p>

          {atendida && alerta.comentario ? (
            <p className="mt-2 rounded-md border border-border bg-app px-3 py-2 text-sm text-fgMuted">
              <span className="text-fgDim">Comentario: </span>
              {alerta.comentario}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {alerta.estado === 'nueva' ? (
          <>
            {!esDetalle ? (
              <Button
                variante="fantasma"
                className="min-h-[44px]"
                onClick={() => setEvidenciaAbierta(true)}
                disabled={sinImagen}
                title={sinImagen ? 'Imagen purgada' : undefined}
              >
                <ImagenIcono className="h-4 w-4" aria-hidden />
                Ver evidencia
              </Button>
            ) : null}
            <Button variante="secundario" className="min-h-[44px]" onClick={() => setAccion('descartar')}>
              Descartar
            </Button>
            <Button variante="exito" className="min-h-[44px]" onClick={() => setAccion('revisar')}>
              Marcar revisada
            </Button>
          </>
        ) : esSupervisor ? (
          // CU-06 · 3a: reabrir solo supervisor+.
          <Button variante="secundario" className="min-h-[44px]" onClick={() => setAccion('reabrir')}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reabrir
          </Button>
        ) : null}
      </div>

      {evidenciaAbierta ? <ModalEvidencia deteccion={d} onCerrar={cerrarEvidencia} /> : null}
      {accion ? <ModalAccionAlerta alerta={alerta} accion={accion} onCerrar={cerrarAccion} /> : null}
    </article>
  )
}
