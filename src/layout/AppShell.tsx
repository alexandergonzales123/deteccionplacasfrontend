/**
 * Layout autenticado de escritorio: sidebar fija de 230 px en `≥ md`. En
 * `< md` la sidebar se oculta y una barra superior con botón hamburguesa
 * (44 px) la abre como panel deslizante.
 */
import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, ShieldCheck } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const [navAbierta, setNavAbierta] = useState(false)
  const cerrarNav = useCallback(() => setNavAbierta(false), [])

  return (
    <div className="min-h-screen bg-app">
      <Sidebar abierta={navAbierta} onCerrar={cerrarNav} />

      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-sidebar px-2 md:hidden">
        <button
          type="button"
          onClick={() => setNavAbierta(true)}
          aria-label="Abrir navegación"
          aria-controls="sidebar"
          aria-expanded={navAbierta}
          className="flex h-11 w-11 items-center justify-center rounded-md text-fg hover:bg-panelHover"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-base font-bold tracking-tight text-fg">Centinela</span>
        </span>
      </header>

      <main className="min-h-screen px-4 py-4 md:ml-[230px] md:px-8 md:py-6">
        <Outlet />
      </main>
    </div>
  )
}
