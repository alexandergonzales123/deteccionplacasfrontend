import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-border bg-panel', className)} {...props} />
}

interface CardHeaderProps {
  titulo: ReactNode
  subtitulo?: ReactNode
  acciones?: ReactNode
  className?: string
}

export function CardHeader({ titulo, subtitulo, acciones, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-border px-5 py-4', className)}>
      <div>
        <h2 className="text-base font-semibold text-fg">{titulo}</h2>
        {subtitulo ? <p className="mt-0.5 text-sm text-fgMuted">{subtitulo}</p> : null}
      </div>
      {acciones ? <div className="shrink-0">{acciones}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />
}
