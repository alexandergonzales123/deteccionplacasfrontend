import type { EstadoAlerta } from '@/api/types'
import { Badge, type TonoBadge } from '@/components/ui'
import { cn } from '@/lib/cn'

const ETIQUETA_ESTADO_ALERTA: Record<EstadoAlerta, string> = {
  nueva: 'Nueva',
  revisada: 'Revisada',
  descartada: 'Descartada',
}

const TONO_ESTADO_ALERTA: Record<EstadoAlerta, TonoBadge> = {
  nueva: 'danger',
  revisada: 'ok',
  descartada: 'muted',
}

interface Props {
  estado: EstadoAlerta
  className?: string
}

/** NUEVA (rojo con punto pulsante) · REVISADA (verde) · DESCARTADA (gris). */
export function BadgeEstadoAlerta({ estado, className }: Props) {
  const tono = TONO_ESTADO_ALERTA[estado] ?? 'muted'
  return (
    <Badge tono={tono} className={className}>
      {estado === 'nueva' ? (
        <span className={cn('h-1.5 w-1.5 rounded-full bg-current', 'animate-pulseDot')} aria-hidden />
      ) : null}
      {ETIQUETA_ESTADO_ALERTA[estado] ?? estado}
    </Badge>
  )
}
