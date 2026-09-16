import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'exito'
type Tamano = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamano?: Tamano
  cargando?: boolean
}

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primary text-app hover:bg-primary-hover font-semibold',
  secundario: 'border border-border bg-panel text-fg hover:bg-panelHover',
  fantasma: 'text-fgMuted hover:bg-panelHover hover:text-fg',
  peligro: 'bg-danger text-white hover:bg-danger/90 font-semibold',
  // Acciones de cierre positivo ("Marcar revisada").
  exito: 'bg-ok text-app hover:bg-ok/90 font-semibold',
}

// CA-12: controles táctiles de al menos 44 px en lg (vista móvil).
const TAMANOS: Record<Tamano, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variante = 'primario', tamano = 'md', cargando = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || cargando}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTES[variante],
        TAMANOS[tamano],
        className,
      )}
      {...props}
    >
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
})
