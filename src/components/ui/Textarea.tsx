import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  ayuda?: string
  /** Muestra "N/max" bajo el campo; requiere `maxLength` y `value` controlado. */
  contador?: boolean
}

/** Área de texto con el mismo estilo que `Input` (comentarios de alerta, notas del watchlist). */
export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, error, ayuda, contador = false, className, id, maxLength, value, rows = 3, ...props },
  ref,
) {
  const idGenerado = useId()
  const textareaId = id ?? idGenerado
  const errorId = `${textareaId}-error`
  const longitud = typeof value === 'string' ? value.length : 0

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={textareaId} className="text-[11px] font-semibold uppercase tracking-wider text-fgMuted">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'min-h-[44px] w-full resize-y rounded-md border bg-app px-3 py-2.5 text-sm text-fg placeholder:text-fgDim focus:outline-none focus:ring-2 focus:ring-primary/50',
          error ? 'border-danger' : 'border-border focus:border-primary',
          className,
        )}
        {...props}
      />
      <div className="flex items-start justify-between gap-3">
        {error ? (
          <p id={errorId} className="text-xs text-danger">
            {error}
          </p>
        ) : ayuda ? (
          <p className="text-xs text-fgDim">{ayuda}</p>
        ) : (
          <span />
        )}
        {contador && maxLength !== undefined ? (
          <span
            className={cn('shrink-0 font-mono text-[11px]', longitud >= maxLength ? 'text-warn' : 'text-fgDim')}
            aria-live="polite"
          >
            {longitud}/{maxLength}
          </span>
        ) : null}
      </div>
    </div>
  )
})
