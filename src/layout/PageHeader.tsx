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
    // En móvil se apila (título arriba, acciones y reloj debajo) para no desbordar a 375 px.
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-fg">{titulo}</h1>
        {subtitulo ? <p className="mt-1 text-sm text-fgMuted">{subtitulo}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:shrink-0 sm:justify-end">
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
        <div className="leading-tight sm:text-right">
          <p className="font-mono text-sm font-semibold text-fg">{formatoHora(ahora)}</p>
          <p className="text-xs capitalize text-fgMuted">{formatoFechaLarga(ahora)}</p>
        </div>
      </div>
    </header>
  )
}
