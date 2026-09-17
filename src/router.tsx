/**
 * Rutas del panel. Cada pantalla exige el rol mínimo de su endpoint principal
 * (sección 11 · matriz de trazabilidad).
 */
import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/auth/RequireAuth'
import { RequireRol } from '@/auth/RequireRol'
import { AppShell } from '@/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { NoEncontradoPage } from '@/pages/NoEncontradoPage'
import { PanelEnVivoPage } from '@/pages/panel/PanelEnVivoPage'
import { BusquedaPlacaPage } from '@/pages/busqueda/BusquedaPlacaPage'
import { CamarasPage } from '@/pages/camaras/CamarasPage'
import { CamaraDetallePage } from '@/pages/camaras/CamaraDetallePage'
import { WatchlistPage } from '@/pages/watchlist/WatchlistPage'
import { AlertasPage } from '@/pages/alertas/AlertasPage'
import { AlertaDetallePage } from '@/pages/alertas/AlertaDetallePage'
import { AuditoriaPage } from '@/pages/auditoria/AuditoriaPage'
import { RetencionPage } from '@/pages/retencion/RetencionPage'
import { CampoPage } from '@/pages/campo/CampoPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: (
              <RequireRol minimo="operador">
                <PanelEnVivoPage />
              </RequireRol>
            ),
          },
          {
            path: '/busqueda',
            element: (
              <RequireRol minimo="operador">
                <BusquedaPlacaPage />
              </RequireRol>
            ),
          },
          {
            path: '/camaras',
            element: (
              <RequireRol minimo="visor">
                <CamarasPage />
              </RequireRol>
            ),
          },
          {
            path: '/camaras/:camaraId',
            element: (
              <RequireRol minimo="visor">
                <CamaraDetallePage />
              </RequireRol>
            ),
          },
          {
            // GET /watchlist: operador. Alta/retiro (supervisor) se resuelven dentro de la página.
            path: '/watchlist',
            element: (
              <RequireRol minimo="operador">
                <WatchlistPage />
              </RequireRol>
            ),
          },
          {
            path: '/alertas',
            element: (
              <RequireRol minimo="operador">
                <AlertasPage />
              </RequireRol>
            ),
          },
          {
            path: '/alertas/:alertaId',
            element: (
              <RequireRol minimo="operador">
                <AlertaDetallePage />
              </RequireRol>
            ),
          },
          {
            path: '/auditoria',
            element: (
              <RequireRol minimo="admin">
                <AuditoriaPage />
              </RequireRol>
            ),
          },
          {
            // GET /configuracion/retencion: visor. Solo lectura (sección 8: transparencia).
            path: '/retencion',
            element: (
              <RequireRol minimo="visor">
                <RetencionPage />
              </RequireRol>
            ),
          },
        ],
      },
      {
        // CU-12: vista móvil con layout propio (sin sidebar). GET /placas/buscar: operador.
        path: '/campo',
        element: (
          <RequireRol minimo="operador">
            <CampoPage />
          </RequireRol>
        ),
      },
    ],
  },
  { path: '*', element: <NoEncontradoPage /> },
])
