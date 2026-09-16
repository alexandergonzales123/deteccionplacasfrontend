import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { EmptyState } from '@/components/ui'

export function NoEncontradoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app">
      <EmptyState
        icono={FileQuestion}
        titulo="Página no encontrada"
        descripcion="La ruta solicitada no existe."
        accion={
          <Link to="/" className="text-sm text-primary hover:underline">
            Ir al panel en vivo
          </Link>
        }
      />
    </div>
  )
}
