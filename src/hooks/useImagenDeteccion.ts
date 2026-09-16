/**
 * Descarga la evidencia (recorte de placa) vía GET /detecciones/{id}/imagen
 * con bearer y la expone como object URL, revocada al cambiar de id o
 * desmontar. No se usa `<img src={imagenUrl}>`: no llevaría el token.
 * 410 → purgada por retención · 404 → no existe.
 *
 * Con `id === null` no descarga nada (fase 'inactivo'); así el llamador puede
 * saltarse la petición (y su registro en auditoría) cuando `imagenUrl` es null.
 */
import { useEffect, useState } from 'react'
import axios from 'axios'
import * as deteccionesApi from '@/api/detecciones'
import { mensajeDeError, statusDe } from '@/api/client'

export type EstadoImagen =
  | { fase: 'inactivo' }
  | { fase: 'cargando' }
  | { fase: 'ok'; url: string }
  | { fase: 'error'; mensaje: string; status?: number }

export function useImagenDeteccion(id: string | null): EstadoImagen {
  const [estado, setEstado] = useState<EstadoImagen>({ fase: 'inactivo' })

  useEffect(() => {
    if (!id) {
      // Solo se vuelve a 'inactivo' si venía de otro id; al montar sin id no hay set redundante.
      setEstado((prev) => (prev.fase === 'inactivo' ? prev : { fase: 'inactivo' }))
      return
    }
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
        setEstado({ fase: 'error', mensaje, status })
      })

    return () => {
      control.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])

  return estado
}
