import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type TonoBadge = 'ok' | 'warn' | 'danger' | 'muted' | 'primary' | 'violeta'

const TONOS: Record<TonoBadge, string> = {
  ok: 'bg-ok/15 text-ok border-ok/30',
  warn: 'bg-warn/15 text-warn border-warn/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  muted: 'bg-fgMuted/10 text-fgMuted border-fgMuted/30',
  primary: 'bg-primary/15 text-primary border-primary/30',
  // Motivo "orden judicial" del watchlist.
  violeta: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
}

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tono?: TonoBadge
  solido?: boolean
}

/** Etiqueta pequeña en mayúsculas (estado, "ALERTA", etc.). */
export function Badge({ tono = 'muted', solido = false, className, ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        solido && tono === 'danger' ? 'border-danger bg-danger text-white' : TONOS[tono],
        className,
      )}
      {...props}
    />
  )
}
