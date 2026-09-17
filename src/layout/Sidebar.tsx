/**
 * Navegación principal. En `≥ md` es una columna fija de 230 px; en `< md` es
 * un panel deslizante controlado por AppShell (`abierta`/`onCerrar`) que se
 * cierra con Escape, clic en el fondo o al navegar.
 */
import { useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { etiquetaRol, tienePermiso } from '@/auth/permisos'
import { textoBadge, useAlertasNuevas } from '@/hooks/useAlertasNuevas'
import { cn } from '@/lib/cn'
import { iniciales } from '@/lib/usuarios'
import { ITEMS_NAV, ITEMS_NAV_PIE, type ItemNav } from './navegacion'

interface Props {
  /** Solo tiene efecto en `< md`; en escritorio la sidebar siempre está visible. */
  abierta: boolean
  onCerrar: () => void
}

function EnlaceNav({ item, badge }: { item: ItemNav; badge: string | null }) {
  const { ruta, etiqueta, icono: Icono, conBadgeAlertas } = item
  return (
    <NavLink
      to={ruta}
      end={ruta === '/'}
      className={({ isActive }) =>
        cn(
          // min-h 44 px: también se usa desde el panel deslizante en móvil (CA-12).
          'flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
          isActive ? 'bg-primary/10 font-semibold text-primary' : 'text-fgMuted hover:bg-panelHover hover:text-fg',
        )
      }
    >
      <Icono className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{etiqueta}</span>
      {conBadgeAlertas && badge ? (
        <span
          className="rounded-full bg-danger px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white"
          aria-label={`${badge} alertas nuevas`}
        >
          {badge}
        </span>
      ) : null}
    </NavLink>
  )
}

export function Sidebar({ abierta, onCerrar }: Props) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const alertas = useAlertasNuevas()
  const badge = textoBadge(alertas.data)
  const asideRef = useRef<HTMLElement>(null)
  const onCerrarRef = useRef(onCerrar)

  useEffect(() => {
    onCerrarRef.current = onCerrar
  }, [onCerrar])

  const items = ITEMS_NAV.filter((i) => tienePermiso(usuario?.rol, i.rolMinimo))
  const itemsPie = ITEMS_NAV_PIE.filter((i) => tienePermiso(usuario?.rol, i.rolMinimo))

  // Escape cierra el panel móvil; al abrir, el foco entra al panel, se bloquea el
  // scroll del body y al cerrar el foco vuelve al disparador.
  useEffect(() => {
    if (!abierta) return
    const previo = document.activeElement as HTMLElement | null
    asideRef.current?.focus()
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrarRef.current()
    }
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = overflowPrevio
      previo?.focus()
    }
  }, [abierta])

  // Navegar cierra el panel (solo relevante cuando está abierto en móvil).
  const rutaActual = location.pathname
  const rutaPrevia = useRef(rutaActual)
  useEffect(() => {
    if (rutaPrevia.current !== rutaActual) {
      rutaPrevia.current = rutaActual
      onCerrarRef.current()
    }
  }, [rutaActual])

  async function cerrarSesion() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {abierta ? (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onMouseDown={onCerrar}
          aria-hidden
          data-testid="sidebar-overlay"
        />
      ) : null}
      <aside
        ref={asideRef}
        tabIndex={-1}
        id="sidebar"
        aria-label="Barra lateral"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-sidebar flex-col border-r border-border bg-sidebar outline-none transition-transform duration-200 md:pointer-events-auto md:visible md:translate-x-0',
          // Cerrado en < md: `invisible` lo saca del orden de tabulación y del árbol de accesibilidad.
          abierta ? 'translate-x-0' : 'invisible pointer-events-none -translate-x-full',
        )}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight text-fg">Centinela</p>
            <p className="text-[11px] uppercase tracking-wider text-fgDim">ANPR Municipal</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar navegación"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-md text-fgDim hover:bg-panelHover hover:text-fg md:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="mt-2 flex-1 overflow-y-auto px-3" aria-label="Navegación principal">
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.ruta}>
                <EnlaceNav item={item} badge={badge} />
              </li>
            ))}
          </ul>
          {itemsPie.length > 0 ? (
            <ul className="mt-4 space-y-0.5 border-t border-border pt-4" aria-label="Otras vistas">
              {itemsPie.map((item) => (
                <li key={item.ruta}>
                  <EnlaceNav item={item} badge={null} />
                </li>
              ))}
            </ul>
          ) : null}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 font-mono text-xs font-bold text-primary">
              {iniciales(usuario?.nombre)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-fg">{usuario?.nombre ?? 'Usuario'}</p>
              {/* TODO(contrato): `Usuario` no tiene campo "área"; se muestra el rol. */}
              <p className="truncate text-xs capitalize text-fgMuted">{etiquetaRol(usuario?.rol)}</p>
            </div>
            <button
              type="button"
              onClick={cerrarSesion}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="flex h-11 w-11 items-center justify-center rounded text-fgDim transition-colors hover:bg-panelHover hover:text-fg"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
