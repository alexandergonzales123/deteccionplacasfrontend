/**
 * Rutas del panel. Cada pantalla exige el rol mínimo de su endpoint principal
 * (sección 11 · matriz de trazabilidad).
 */
import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/auth/RequireAuth'
import { RequireRol } from '@/auth/RequireRol'
import { AppShell } from '@/layout/AppShell'
import { EnConstruccionPage } from '@/pages/EnConstruccionPage'
import { LoginPage } from '@/pages/LoginPage'
import { NoEncontradoPage } from '@/pages/NoEncontradoPage'
import { PanelEnVivoPage } from '@/pages/panel/PanelEnVivoPage'
import { BusquedaPlacaPage } from '@/pages/busqueda/BusquedaPlacaPage'
import { CamarasPage } from '@/pages/camaras/CamarasPage'
import { CamaraDetallePage } from '@/pages/camaras/CamaraDetallePage'

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
            path: '/watchlist',
            element: (
              <RequireRol minimo="operador">
                <EnConstruccionPage titulo="Watchlist" subtitulo="Vehículos de interés bajo vigilancia" />
              </RequireRol>
            ),
          },
          {
            path: '/alertas',
            element: (
              <RequireRol minimo="operador">
                <EnConstruccionPage titulo="Alertas" subtitulo="Coincidencias entre detecciones y watchlist" />
              </RequireRol>
            ),
          },
          {
            path: '/auditoria',
            element: (
              <RequireRol minimo="admin">
                <EnConstruccionPage titulo="Auditoría" subtitulo="Quién consultó qué placa, cuándo y por qué" />
              </RequireRol>
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <NoEncontradoPage /> },
])
