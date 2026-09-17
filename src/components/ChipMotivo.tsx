import type { MotivoWatchlist } from '@/api/types'
import { Chip } from '@/components/ui'
import { cn } from '@/lib/cn'
import { etiquetaMotivo, tonoMotivo } from '@/lib/watchlist'

interface Props {
  motivo: MotivoWatchlist | string | null | undefined
  className?: string
}

/**
 * Motivo de vigilancia con el mismo color en Watchlist y Alertas:
 * robado rojo · requisitoriado ámbar · moroso cyan · orden judicial violeta · otro gris.
 */
export function ChipMotivo({ motivo, className }: Props) {
  return (
    <Chip tono={tonoMotivo(motivo)} className={cn('whitespace-nowrap', className)}>
      {etiquetaMotivo(motivo)}
    </Chip>
  )
}
