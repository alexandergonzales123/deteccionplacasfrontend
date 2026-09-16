import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import type { TonoBadge } from './Badge'

const TONOS: Record<TonoBadge, string> = {
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger',
  muted: 'bg-fgMuted/10 text-fgMuted',
  primary: 'bg-primary/15 text-primary',
}

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tono?: TonoBadge
  punto?: boolean
}

/** Píldora redondeada con texto normal (confianza "94%", estado "Activa"). */
export function Chip({ tono = 'muted', punto = false, className, children, ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold',
        TONOS[tono],
        className,
      )}
      {...props}
    >
      {punto ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  )
}
