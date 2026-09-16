/**
 * CU-02 · flujo principal paso 3-4: placa, cámara, hora, confianza; resalta
 * las detecciones que generaron alerta.
 * TODO(contrato): la miniatura (`imagenUrl`) requiere GET /detecciones/{id}/imagen
 * con bearer y queda auditada; se incorpora en la fase de Alertas/Búsqueda.
 */
import { MapPin } from 'lucide-react'
import type { Deteccion } from '@/api/types'
import { Badge, Chip, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/components/ui'
import { cn } from '@/lib/cn'
import { nivelConfianza, porcentajeConfianza, type NivelConfianza } from '@/lib/confianza'
import { formatoAbsoluto, formatoRelativo } from '@/lib/fechas'
import { formatearPlaca } from '@/lib/placas'

const TONO_CONFIANZA: Record<NivelConfianza, 'ok' | 'warn' | 'danger'> = {
  alta: 'ok',
  media: 'warn',
  baja: 'danger',
}

interface Props {
  detecciones: Deteccion[]
  /** Reloj compartido para que "hace 12 s" avance sin refetch. */
  ahora: Date
}

export function TablaDetecciones({ detecciones, ahora }: Props) {
  return (
    <Table>
      <THead>
        <tr>
          <Th>Placa</Th>
          <Th>Cámara / Ubicación</Th>
          <Th>Hora</Th>
          <Th>Confianza</Th>
          <Th className="text-right">Estado</Th>
        </tr>
      </THead>
      <TBody>
        {detecciones.map((d) => {
          const nivel = nivelConfianza(d.confianza)
          return (
            <Tr
              key={d.id}
              className={cn(
                d.generoAlerta
                  ? 'border-l-2 border-l-danger bg-danger/[0.06] hover:bg-danger/[0.1]'
                  : 'border-l-2 border-l-transparent hover:bg-panelHover',
              )}
            >
              <Td>
                <span className="font-mono text-base font-bold tracking-wider text-fg">
                  {formatearPlaca(d.placaNormalizada)}
                </span>
              </Td>
              <Td>
                <span className="flex items-center gap-1.5 text-fg">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-fgDim" aria-hidden />
                  <span className="truncate">{d.camara.nombre}</span>
                </span>
              </Td>
              <Td>
                <time
                  dateTime={d.capturadaEn}
                  title={formatoAbsoluto(d.capturadaEn)}
                  className="font-mono text-xs text-fgMuted"
                >
                  {formatoRelativo(d.capturadaEn, ahora)}
                </time>
              </Td>
              <Td>
                <Chip tono={TONO_CONFIANZA[nivel]}>{porcentajeConfianza(d.confianza)}</Chip>
              </Td>
              <Td className="text-right">
                {d.generoAlerta ? <Badge tono="danger" solido>Alerta</Badge> : null}
              </Td>
            </Tr>
          )
        })}
      </TBody>
    </Table>
  )
}

export function TablaDeteccionesSkeleton({ filas = 8 }: { filas?: number }) {
  return (
    <Table>
      <THead>
        <tr>
          <Th>Placa</Th>
          <Th>Cámara / Ubicación</Th>
          <Th>Hora</Th>
          <Th>Confianza</Th>
          <Th className="text-right">Estado</Th>
        </tr>
      </THead>
      <TBody>
        {Array.from({ length: filas }).map((_, i) => (
          <Tr key={i}>
            <Td>
              <Skeleton className="h-5 w-20" />
            </Td>
            <Td>
              <Skeleton className="h-4 w-64" />
            </Td>
            <Td>
              <Skeleton className="h-4 w-16" />
            </Td>
            <Td>
              <Skeleton className="h-5 w-12 rounded-full" />
            </Td>
            <Td />
          </Tr>
        ))}
      </TBody>
    </Table>
  )
}
