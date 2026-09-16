import { Chip } from '@/components/ui'
import { nivelConfianza, porcentajeConfianza, type NivelConfianza } from '@/lib/confianza'

const TONO_CONFIANZA: Record<NivelConfianza, 'ok' | 'warn' | 'danger'> = {
  alta: 'ok',
  media: 'warn',
  baja: 'danger',
}

/** Semáforo de confianza del OCR ("94%"), compartido por panel, búsqueda y cámaras. */
export function ChipConfianza({ confianza, className }: { confianza: number; className?: string }) {
  return (
    <Chip tono={TONO_CONFIANZA[nivelConfianza(confianza)]} className={className}>
      {porcentajeConfianza(confianza)}
    </Chip>
  )
}
