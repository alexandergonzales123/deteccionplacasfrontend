import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, Skeleton } from '@/components/ui'
import { cn } from '@/lib/cn'

interface Props {
  etiqueta: string
  valor: ReactNode
  detalle?: ReactNode
  icono: LucideIcon
  tono?: 'primary' | 'ok' | 'danger' | 'warn' | 'muted'
  cargando?: boolean
  error?: boolean
}

const TONO_ICONO: Record<NonNullable<Props['tono']>, string> = {
  primary: 'bg-primary/15 text-primary',
  ok: 'bg-ok/15 text-ok',
  danger: 'bg-danger/15 text-danger',
  warn: 'bg-warn/15 text-warn',
  muted: 'bg-fgMuted/10 text-fgMuted',
}

export function StatCard({ etiqueta, valor, detalle, icono: Icono, tono = 'primary', cargando, error }: Props) {
  return (
    <Card className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fgMuted">{etiqueta}</p>
        {cargando ? (
          <Skeleton className="mt-2 h-8 w-24" />
        ) : error ? (
          <p className="mt-1 font-mono text-2xl font-bold text-fgDim" title="Sin datos por error de conexión">
            --
          </p>
        ) : (
          <p className="mt-1 font-mono text-3xl font-bold leading-none text-fg">{valor}</p>
        )}
        {detalle && !cargando ? <p className="mt-2 text-xs text-fgMuted">{error ? 'Sin datos' : detalle}</p> : null}
      </div>
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', TONO_ICONO[tono])}>
        <Icono className="h-5 w-5" aria-hidden />
      </span>
    </Card>
  )
}
