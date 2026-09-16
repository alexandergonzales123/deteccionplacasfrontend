import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { etiquetaRol, tienePermiso } from '@/auth/permisos'
import { textoBadge, useAlertasNuevas } from '@/hooks/useAlertasNuevas'
import { cn } from '@/lib/cn'
import { iniciales } from '@/lib/usuarios'
import { ITEMS_NAV } from './navegacion'

export function Sidebar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const alertas = useAlertasNuevas()
  const badge = textoBadge(alertas.data)

  const items = ITEMS_NAV.filter((i) => tienePermiso(usuario?.rol, i.rolMinimo))

  async function cerrarSesion() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="fixed inset-y-0 left-0 flex w-sidebar flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-base font-bold tracking-tight text-fg">Centinela</p>
          <p className="text-[11px] uppercase tracking-wider text-fgDim">ANPR Municipal</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 px-3" aria-label="Navegación principal">
        <ul className="space-y-0.5">
          {items.map(({ ruta, etiqueta, icono: Icono, conBadgeAlertas }) => (
            <li key={ruta}>
              <NavLink
                to={ruta}
                end={ruta === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-fgMuted hover:bg-panelHover hover:text-fg',
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
            </li>
          ))}
        </ul>
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
            className="rounded p-1.5 text-fgDim transition-colors hover:bg-panelHover hover:text-fg"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  )
}
