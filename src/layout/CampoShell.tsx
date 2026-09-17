/**
 * Layout de la vista móvil de campo (CU-12, RNF-16): sin sidebar, una barra
 * superior mínima y contenido apilado en una sola columna para operar con
 * una mano. Los controles miden al menos 44 px (CA-12).
 */
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'

export function CampoShell({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  async function cerrarSesion() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-app">
      <header className="sticky top-0 z-20 border-b border-border bg-sidebar">
        <div className="mx-auto flex h-14 w-full max-w-md items-center gap-2 px-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-bold tracking-tight text-fg">Centinela</p>
            <p className="truncate text-[11px] text-fgMuted">{usuario?.nombre ?? 'Usuario'}</p>
          </div>
          <Link
            to="/"
            className="flex h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-fgMuted hover:bg-panelHover hover:text-fg"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Panel completo
          </Link>
          <button
            type="button"
            onClick={cerrarSesion}
            className="flex h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-fgMuted hover:bg-panelHover hover:text-fg"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Salir
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 pb-12">{children}</main>
    </div>
  )
}
