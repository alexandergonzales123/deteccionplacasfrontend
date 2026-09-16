import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  ayuda?: string
}

/** Select nativo con el mismo estilo que `Input` (alto 44 px, CA-12). */
export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, ayuda, className, id, children, ...props },
  ref,
) {
  const idGenerado = useId()
  const selectId = id ?? idGenerado
  const errorId = `${selectId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-[11px] font-semibold uppercase tracking-wider text-fgMuted">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-11 w-full appearance-none rounded-md border bg-app pl-3 pr-9 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/50',
            error ? 'border-danger' : 'border-border focus:border-primary',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fgDim"
          aria-hidden
        />
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : ayuda ? (
        <p className="text-xs text-fgDim">{ayuda}</p>
      ) : null}
    </div>
  )
})
