/**
 * Mapa Leaflet reutilizable (Búsqueda por placa y detalle de cámara).
 * Marcadores numerados en orden cronológico (1 = más antiguo); el último es
 * más grande y cyan; polilínea punteada opcional uniendo los puntos en orden.
 * Los íconos son `divIcon` propios: evita el bug de Vite con los PNG por
 * defecto de Leaflet (rutas rotas al empaquetar) y permite el tema oscuro.
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { divIcon, latLngBounds, type DivIcon, type Map as MapaLeaflet } from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { cn } from '@/lib/cn'

export interface PuntoMapa {
  id: string
  lat: number
  lng: number
  /** Orden cronológico, 1 = más antiguo. */
  orden: number
  esUltimo: boolean
  /** Texto del tooltip (nombre de cámara, hora). */
  etiqueta?: string
}

export interface MapaAvistamientosHandle {
  /** Centra el mapa en el punto con ese id (clic en la línea de tiempo). */
  centrarEn: (id: string) => void
}

interface Props {
  puntos: PuntoMapa[]
  polilinea?: boolean
  className?: string
  /** Zoom al centrar en un punto o cuando hay un solo punto. */
  zoomPunto?: number
}

// TODO(despliegue): servir tiles propios para intranet (la central puede no
// tener salida a internet). Cambiar `URL_TILES` por el servidor local.
const URL_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

// Centro por defecto (Lima) cuando no hay puntos.
const CENTRO_DEFECTO: [number, number] = [-12.0464, -77.0428]

// Los íconos se cachean: las páginas re-renderizan cada segundo (reloj) y
// recrear el divIcon obligaría a Leaflet a reemplazar el DOM del marcador.
const cacheIconos = new Map<string, DivIcon>()

function iconoNumerado(orden: number, esUltimo: boolean): DivIcon {
  const clave = `${Math.trunc(orden)}:${esUltimo ? 'u' : 'n'}`
  const existente = cacheIconos.get(clave)
  if (existente) return existente
  const tam = esUltimo ? 34 : 24
  // Solo se interpola un número (nunca texto del usuario): sin riesgo de inyección.
  const icono = divIcon({
    className: '',
    html: `<span class="${esUltimo ? 'marcador-punto marcador-punto--ultimo' : 'marcador-punto'}">${Math.trunc(orden)}</span>`,
    iconSize: [tam, tam],
    iconAnchor: [tam / 2, tam / 2],
    tooltipAnchor: [0, -tam / 2],
  })
  cacheIconos.set(clave, icono)
  return icono
}

/** Ajusta la vista a los puntos cada vez que cambia el conjunto. */
function ControlVista({ puntos, zoomPunto }: { puntos: PuntoMapa[]; zoomPunto: number }) {
  const mapa = useMap()

  const claveConjunto = puntos.map((p) => `${p.id}:${p.lat},${p.lng}`).join('|')
  useEffect(() => {
    if (puntos.length === 0) return
    if (puntos.length === 1) {
      mapa.setView([puntos[0].lat, puntos[0].lng], zoomPunto)
      return
    }
    mapa.fitBounds(latLngBounds(puntos.map((p) => [p.lat, p.lng] as [number, number])), {
      padding: [40, 40],
      maxZoom: 17,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveConjunto, mapa, zoomPunto])

  // Leaflet calcula el tamaño al montar; si el contenedor cambia (grid
  // responsive, sidebar) hay que avisarle o los tiles quedan a medias.
  useEffect(() => {
    const contenedor = mapa.getContainer()
    const ro = new ResizeObserver(() => mapa.invalidateSize())
    ro.observe(contenedor)
    return () => ro.disconnect()
  }, [mapa])

  return null
}

export const MapaAvistamientos = forwardRef<MapaAvistamientosHandle, Props>(function MapaAvistamientos(
  { puntos, polilinea = false, className, zoomPunto = 16 },
  ref,
) {
  const mapaRef = useRef<MapaLeaflet | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      centrarEn: (id) => {
        const p = puntos.find((x) => x.id === id)
        if (!p || !mapaRef.current) return
        mapaRef.current.flyTo([p.lat, p.lng], Math.max(mapaRef.current.getZoom(), zoomPunto), { duration: 0.6 })
      },
    }),
    [puntos, zoomPunto],
  )

  const ordenados = useMemo(() => [...puntos].sort((a, b) => a.orden - b.orden), [puntos])
  const trazo = useMemo(() => ordenados.map((p) => [p.lat, p.lng] as [number, number]), [ordenados])

  return (
    <div className={cn('relative isolate overflow-hidden rounded-md border border-border bg-app', className)}>
      <MapContainer
        ref={mapaRef}
        center={CENTRO_DEFECTO}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: '#080c14' }}
      >
        <TileLayer url={URL_TILES} attribution={ATTRIBUTION} />
        <ControlVista puntos={puntos} zoomPunto={zoomPunto} />
        {polilinea && trazo.length > 1 ? (
          <Polyline positions={trazo} pathOptions={{ color: '#00b4d8', weight: 3, dashArray: '6 8', opacity: 0.9 }} />
        ) : null}
        {ordenados.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={iconoNumerado(p.orden, p.esUltimo)}>
            {p.etiqueta ? (
              <Tooltip direction="top" opacity={1}>
                {p.etiqueta}
              </Tooltip>
            ) : null}
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
})
