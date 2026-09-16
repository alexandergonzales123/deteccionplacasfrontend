/**
 * CU-03 paso 4 / CU-04: avistamientos del más reciente al más antiguo. El más
 * reciente se resalta según frescura (CA-06) y SIEMPRE aclara que es el último
 * punto donde el vehículo fue visto, no su ubicación actual (regla CU-04).
 */
import { Image as ImagenIcono, MapPin } from 'lucide-react'
import type { Deteccion, Frescura } from '@/api/types'
import { ChipConfianza } from '@/components/ChipConfianza'
import { TiempoRelativo } from '@/components/TiempoRelativo'
import { Badge, Chip } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatoAbsoluto } from '@/lib/fechas'
import { ESTILO_FRESCURA } from '@/lib/frescura'

export interface ItemLineaTiempo {
  deteccion: Deteccion
  /** Orden cronológico, 1 = más antiguo. */
  orden: number
}

interface Props {
  items: ItemLineaTiempo[]
  /** Frescura del ítem más reciente (ya combinada servidor/cliente por la página). */
  frescuraUltimo: Frescura
  seleccionadoId: string | null
  onSeleccionar: (deteccion: Deteccion) => void
  onVerEvidencia: (deteccion: Deteccion) => void
}

/** Leyenda de frescura. Solo elementos inline: va dentro del `<p>` del CardHeader. */
export function LeyendaFrescura() {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fgMuted" role="list" aria-label="Leyenda de frescura">
      {(['reciente', 'probable', 'antiguo'] as const).map((f) => (
        <span key={f} role="listitem" className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full bg-current', ESTILO_FRESCURA[f].texto)} aria-hidden />
          {ESTILO_FRESCURA[f].etiqueta}
          {f === 'reciente' ? ' · < 5 min' : f === 'probable' ? ' · < 1 h' : ''}
        </span>
      ))}
    </span>
  )
}

export function LineaTiempo({ items, frescuraUltimo, seleccionadoId, onSeleccionar, onVerEvidencia }: Props) {
  return (
    <ol className="divide-y divide-border" aria-label="Avistamientos">
      {items.map(({ deteccion: d, orden }, i) => {
        const esUltimo = i === 0
        const estilo = ESTILO_FRESCURA[frescuraUltimo]
        const seleccionado = seleccionadoId === d.id
        return (
          <li
            key={d.id}
            className={cn(
              'border-l-2 transition-colors',
              esUltimo ? estilo.borde : seleccionado ? 'border-l-primary' : 'border-l-transparent',
              seleccionado ? 'bg-panelHover' : 'hover:bg-panelHover/60',
              esUltimo && frescuraUltimo === 'reciente' && 'bg-ok/[0.04]',
              esUltimo && frescuraUltimo === 'probable' && 'bg-warn/[0.04]',
            )}
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => onSeleccionar(d)}
                aria-pressed={seleccionado}
                aria-label={`Centrar el mapa en el avistamiento ${orden}`}
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                  esUltimo ? 'border-primary bg-primary text-app' : 'border-border bg-app text-fg hover:border-fgMuted',
                )}
              >
                {orden}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSeleccionar(d)}
                    className="flex min-h-[44px] min-w-0 items-center gap-1.5 text-left text-sm font-semibold text-fg hover:text-primary focus:outline-none focus-visible:text-primary"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-fgDim" aria-hidden />
                    <span className="truncate">{d.camara.nombre}</span>
                  </button>
                  {esUltimo ? (
                    <Chip tono={estilo.tono} punto>
                      {estilo.etiqueta}
                    </Chip>
                  ) : null}
                  {d.generoAlerta ? (
                    <Badge tono="danger" solido>
                      Alerta
                    </Badge>
                  ) : null}
                </div>

                {esUltimo && frescuraUltimo === 'antiguo' ? (
                  // CA-06: si es antiguo, la antigüedad va prominente y en gris.
                  <p className="mt-1 font-mono text-2xl font-bold leading-none text-fgMuted">
                    <TiempoRelativo valor={d.capturadaEn} />
                  </p>
                ) : null}

                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fgMuted">
                  <time dateTime={d.capturadaEn} className="font-mono">
                    {formatoAbsoluto(d.capturadaEn)}
                  </time>
                  <span aria-hidden>·</span>
                  <TiempoRelativo valor={d.capturadaEn} className={cn(esUltimo && estilo.texto)} />
                  <ChipConfianza confianza={d.confianza} />
                </p>

                {esUltimo ? (
                  <p className="mt-2 text-xs leading-relaxed text-fgMuted">
                    Último punto donde el vehículo fue visto. No equivale a su ubicación actual.
                  </p>
                ) : null}

                {d.imagenUrl ? (
                  <button
                    type="button"
                    onClick={() => onVerEvidencia(d)}
                    className="mt-1 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-primary hover:underline focus:outline-none focus-visible:underline"
                  >
                    <ImagenIcono className="h-3.5 w-3.5" aria-hidden />
                    Ver evidencia
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-fgDim">Sin imagen (purgada o no enviada)</p>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
