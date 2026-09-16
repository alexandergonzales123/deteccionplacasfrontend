/** Layout autenticado: sidebar fija de 230 px + área de contenido. */
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="min-h-screen bg-app">
      <Sidebar />
      <main className="ml-[230px] min-h-screen px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
