import type { ReactNode } from 'react'
import { useReloj } from '@/hooks/useReloj'
import { cn } from '@/lib/cn'
import { formatoFechaLarga, formatoHora } from '@/lib/fechas'

export type EstadoEnVivo = 'ok' | 'error' | 'inactivo'

interface Props {
  titulo: string
  subtitulo?: ReactNode
  /** Indicador "● En vivo": verde si el último fetch fue exitoso, rojo si hay error. */
  enVivo?: EstadoEnVivo
  acciones?: ReactNode
}

export function PageHeader({ titulo, subtitulo, enVivo = 'inactivo', acciones }: Props) {
  const ahora = useReloj(1000)

  return (
    <header className="mb-6 flex items-start justify-between gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">{titulo}</h1>
        {subtitulo ? <p className="mt-1 text-sm text-fgMuted">{subtitulo}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {acciones}
        {enVivo !== 'inactivo' ? (
          <span
            className={cn(
              'inline-flex items-center gap-2 text-xs font-semibold',
              enVivo === 'ok' ? 'text-ok' : 'text-danger',
            )}
            role="status"
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full bg-current',
                enVivo === 'ok' ? 'animate-pulseDot' : '',
              )}
              aria-hidden
            />
            {enVivo === 'ok' ? 'En vivo' : 'Sin conexión'}
          </span>
        ) : null}
        <div className="text-right leading-tight">
          <p className="font-mono text-sm font-semibold text-fg">{formatoHora(ahora)}</p>
          <p className="text-xs capitalize text-fgMuted">{formatoFechaLarga(ahora)}</p>
        </div>
      </div>
    </header>
  )
}
