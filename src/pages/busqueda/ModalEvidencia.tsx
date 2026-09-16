/**
 * Recorte de la placa (evidencia). Se descarga con bearer vía
 * GET /detecciones/{id}/imagen (auditado) y se muestra como object URL, que
 * se revoca al cerrar. No se usa `<img src={imagenUrl}>`: no llevaría el token.
 * 410 → purgada por retención.
 */
import { useEffect, useState } from 'react'
import axios from 'axios'
import { ImageOff } from 'lucide-react'
import * as deteccionesApi from '@/api/detecciones'
import { mensajeDeError, statusDe } from '@/api/client'
import type { Deteccion } from '@/api/types'
import { Button, EmptyState, Modal, Skeleton } from '@/components/ui'
import { formatoAbsoluto } from '@/lib/fechas'
import { formatearPlaca } from '@/lib/placas'

interface Props {
  deteccion: Deteccion | null
  onCerrar: () => void
}

type Estado = { fase: 'cargando' } | { fase: 'ok'; url: string } | { fase: 'error'; mensaje: string }

export function ModalEvidencia({ deteccion, onCerrar }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' })
  const id = deteccion?.id ?? null

  useEffect(() => {
    if (!id) return
    let url: string | null = null
    // Abortar en cleanup evita la doble descarga (y doble auditoría) del
    // doble montaje de StrictMode y al cerrar antes de que termine.
    const control = new AbortController()
    setEstado({ fase: 'cargando' })

    deteccionesApi
      .descargarImagenDeteccion(id, control.signal)
      .then((blob) => {
        if (control.signal.aborted) return
        url = URL.createObjectURL(blob)
        setEstado({ fase: 'ok', url })
      })
      .catch((err: unknown) => {
        if (control.signal.aborted || axios.isCancel(err)) return
        const status = statusDe(err)
        const mensaje =
          status === 410
            ? 'Imagen purgada por política de retención'
            : status === 404
              ? 'La imagen no existe'
              : mensajeDeError(err, 'No se pudo descargar la imagen')
        setEstado({ fase: 'error', mensaje })
      })

    return () => {
      control.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])

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
      {estado.fase === 'cargando' ? (
        <Skeleton className="aspect-video w-full" />
      ) : estado.fase === 'ok' ? (
        <img
          src={estado.url}
          alt={`Recorte de la placa ${deteccion ? formatearPlaca(deteccion.placaNormalizada) : ''}`}
          className="mx-auto max-h-[60vh] rounded-md border border-border"
        />
      ) : (
        <EmptyState icono={ImageOff} tono="advertencia" titulo={estado.mensaje} className="py-8" />
      )}
      <p className="mt-3 text-xs text-fgDim">Texto crudo del OCR: <span className="font-mono">{deteccion?.placa}</span>. La descarga queda registrada en auditoría.</p>
    </Modal>
  )
}
