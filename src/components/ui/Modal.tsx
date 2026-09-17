/**
 * Diálogo modal genérico: role="dialog", cierra con Escape y clic en el fondo
 * (salvo `bloqueante`), enfoca el primer control al abrir y devuelve el foco al
 * cerrar. Se renderiza en un portal sobre `document.body`.
 *
 * El foco inicial se decide UNA vez por apertura (efecto con deps `[abierto]`):
 * las páginas re-renderizan con frecuencia y pasan callbacks nuevos, y eso no
 * debe mover el foco mientras el usuario escribe. `onCerrar` se lee desde un
 * ref por la misma razón. Para elegir el control inicial, márquelo con
 * `data-foco-inicial` (React no refleja `autoFocus` como atributo DOM).
 */
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  abierto: boolean
  onCerrar: () => void
  titulo: ReactNode
  descripcion?: ReactNode
  children: ReactNode
  /** Acciones al pie (botones). */
  pie?: ReactNode
  /** Si es true, ni Escape ni el clic fuera cierran: solo las acciones del pie. */
  bloqueante?: boolean
  tamano?: 'sm' | 'md' | 'lg'
}

const TAMANOS = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' } as const

const SELECTOR_ENFOCABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ abierto, onCerrar, titulo, descripcion, children, pie, bloqueante = false, tamano = 'md' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const cuerpoRef = useRef<HTMLDivElement>(null)
  const onCerrarRef = useRef(onCerrar)
  const idBase = useId()
  const idTitulo = `${idBase}-titulo`
  const idDescripcion = `${idBase}-descripcion`

  useEffect(() => {
    onCerrarRef.current = onCerrar
  }, [onCerrar])

  // Foco inicial + bloqueo de scroll + devolución del foco: solo al abrir/cerrar.
  useEffect(() => {
    if (!abierto) return
    const previo = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const primero =
      panel?.querySelector<HTMLElement>('[data-foco-inicial]') ??
      cuerpoRef.current?.querySelector<HTMLElement>(SELECTOR_ENFOCABLE) ??
      panel?.querySelector<HTMLElement>(SELECTOR_ENFOCABLE)
    ;(primero ?? panel)?.focus()
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowPrevio
      previo?.focus()
    }
  }, [abierto])

  // Escape y trampa de foco (Tab no sale del diálogo).
  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e: KeyboardEvent) => {
      const panel = panelRef.current
      if (e.key === 'Escape' && !bloqueante) {
        e.stopPropagation()
        onCerrarRef.current()
        return
      }
      if (e.key === 'Tab' && panel) {
        const enfocables = Array.from(panel.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE))
        if (enfocables.length === 0) return
        const primero = enfocables[0]
        const ultimo = enfocables[enfocables.length - 1]
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault()
          ultimo.focus()
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault()
          primero.focus()
        }
      }
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [abierto, bloqueante])

  if (!abierto) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (!bloqueante && e.target === e.currentTarget) onCerrarRef.current()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descripcion ? idDescripcion : undefined}
        tabIndex={-1}
        className={cn(
          'flex max-h-[95vh] w-full flex-col rounded-t-lg border border-border bg-panel shadow-2xl outline-none sm:rounded-lg',
          TAMANOS[tamano],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-base font-semibold text-fg">
              {titulo}
            </h2>
            {descripcion ? (
              <p id={idDescripcion} className="mt-0.5 text-sm text-fgMuted">
                {descripcion}
              </p>
            ) : null}
          </div>
          {!bloqueante ? (
            <button
              type="button"
              onClick={() => onCerrarRef.current()}
              aria-label="Cerrar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-fgDim hover:bg-panelHover hover:text-fg"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <div ref={cuerpoRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {pie ? <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{pie}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
