import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  /** Label en mayúsculas pequeñas, como en el mockup ("CORREO INSTITUCIONAL"). */
  label?: string
  error?: string
  ayuda?: string
  /** Elemento a la derecha dentro del campo (p. ej. toggle de contraseña). */
  sufijo?: ReactNode
  mono?: boolean
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, ayuda, sufijo, mono = false, className, id, ...props },
  ref,
) {
  const idGenerado = useId()
  const inputId = id ?? idGenerado
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-wider text-fgMuted">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-11 w-full rounded-md border bg-app px-3 text-sm text-fg placeholder:text-fgDim focus:outline-none focus:ring-2 focus:ring-primary/50',
            error ? 'border-danger' : 'border-border focus:border-primary',
            sufijo ? 'pr-11' : '',
            mono ? 'font-mono uppercase tracking-wider' : '',
            className,
          )}
          {...props}
        />
        {sufijo ? <div className="absolute inset-y-0 right-0 flex items-center pr-2">{sufijo}</div> : null}
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
