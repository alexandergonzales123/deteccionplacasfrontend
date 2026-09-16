/**
 * Imagen de evidencia de una detección (skeleton → imagen → aviso), compartida
 * por el modal de evidencia, los modales de atención de alertas y el detalle
 * de alerta. Si `imagenUrl` es null no se descarga nada: ya se sabe que fue
 * purgada o no enviada, y evita un GET auditado que devolvería 410.
 */
import { ImageOff } from 'lucide-react'
import type { Deteccion } from '@/api/types'
import { EmptyState, Skeleton } from '@/components/ui'
import { useImagenDeteccion } from '@/hooks/useImagenDeteccion'
import { cn } from '@/lib/cn'
import { formatearPlaca } from '@/lib/placas'

interface Props {
  deteccion: Pick<Deteccion, 'id' | 'placaNormalizada' | 'imagenUrl'>
  /** Clases del `<img>` (alto máximo, etc.). */
  className?: string
}

export function EvidenciaDeteccion({ deteccion, className }: Props) {
  const sinImagen = deteccion.imagenUrl === null
  const estado = useImagenDeteccion(sinImagen ? null : deteccion.id)

  if (sinImagen || estado.fase === 'inactivo') {
    return <EmptyState icono={ImageOff} tono="advertencia" titulo="Imagen purgada o no enviada" className="py-8" />
  }
  if (estado.fase === 'cargando') {
    return <Skeleton className="aspect-video w-full" />
  }
  if (estado.fase === 'error') {
    return <EmptyState icono={ImageOff} tono="advertencia" titulo={estado.mensaje} className="py-8" />
  }
  return (
    <img
      src={estado.url}
      alt={`Recorte de la placa ${formatearPlaca(deteccion.placaNormalizada)}`}
      className={cn('mx-auto w-full rounded-md border border-border bg-app object-contain', className)}
    />
  )
}
