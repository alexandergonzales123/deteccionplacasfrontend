import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  icono?: LucideIcon
  titulo: string
  descripcion?: ReactNode
  accion?: ReactNode
  tono?: 'neutro' | 'advertencia' | 'error'
  className?: string
}

export function EmptyState({ icono: Icono, titulo, descripcion, accion, tono = 'neutro', className }: Props) {
  const colorIcono = tono === 'error' ? 'text-danger' : tono === 'advertencia' ? 'text-warn' : 'text-fgDim'
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icono ? <Icono className={cn('mb-3 h-8 w-8', colorIcono)} aria-hidden /> : null}
      <p className="text-sm font-semibold text-fg">{titulo}</p>
      {descripcion ? <p className="mt-1 max-w-md text-sm text-fgMuted">{descripcion}</p> : null}
      {accion ? <div className="mt-4">{accion}</div> : null}
    </div>
  )
}
