/**
 * Recorte de la placa (evidencia). La descarga con bearer, el object URL y
 * los códigos 404/410 viven en `useImagenDeteccion`; aquí solo la
 * presentación. Lo comparten Búsqueda (línea de tiempo) y Alertas.
 */
import { ImageOff } from 'lucide-react'
import type { Deteccion } from '@/api/types'
import { Button, EmptyState, Modal, Skeleton } from '@/components/ui'
import { useImagenDeteccion } from '@/hooks/useImagenDeteccion'
import { formatoAbsoluto } from '@/lib/fechas'
import { formatearPlaca } from '@/lib/placas'

interface Props {
  deteccion: Deteccion | null
  onCerrar: () => void
}

export function ModalEvidencia({ deteccion, onCerrar }: Props) {
  const estado = useImagenDeteccion(deteccion?.id ?? null)

  return (
    <Modal
      abierto={deteccion !== null}
      onCerrar={onCerrar}
      titulo={deteccion ? `Evidencia · ${formatearPlaca(deteccion.placaNormalizada)}` : 'Evidencia'}
      descripcion={
        deteccion ? `${deteccion.camara.nombre} · ${formatoAbsoluto(deteccion.capturadaEn)}` : undefined
      }
      pie={
        <Button variante="secundario" className="min-h-[44px]" onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      {estado.fase === 'ok' ? (
        <img
          src={estado.url}
          alt={`Recorte de la placa ${deteccion ? formatearPlaca(deteccion.placaNormalizada) : ''}`}
          className="mx-auto max-h-[60vh] rounded-md border border-border"
        />
      ) : estado.fase === 'error' ? (
        <EmptyState icono={ImageOff} tono="advertencia" titulo={estado.mensaje} className="py-8" />
      ) : (
        <Skeleton className="aspect-video w-full" />
      )}
      <p className="mt-3 text-xs text-fgDim">Texto crudo del OCR: <span className="font-mono">{deteccion?.placa}</span>. La descarga queda registrada en auditoría.</p>
    </Modal>
  )
}
