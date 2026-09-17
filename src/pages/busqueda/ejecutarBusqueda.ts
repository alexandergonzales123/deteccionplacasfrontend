/**
 * Cascada de CU-03: exacta (avistamientos + último avistamiento) → si no hay
 * resultados, difusa (3a) → si tampoco, vacío (4a). Si el patrón trae
 * comodines `?`/`*`, va directo a la difusa (CA-05).
 * Se ejecuta SOLO al pulsar Buscar: cada llamada queda auditada (CA-04).
 */
import * as placasApi from '@/api/placas'
import { statusDe } from '@/api/client'
import type { CandidataPlaca, Deteccion, UbicacionActual } from '@/api/types'

export const LIMITE_AVISTAMIENTOS = 200

export interface ParametrosBusqueda {
  /** Placa normalizada o patrón con comodines. */
  placa: string
  /** ISO date-time. */
  desde: string
  /** ISO date-time. */
  hasta: string
  motivo: string
}

export type ResultadoBusqueda =
  | {
      tipo: 'avistamientos'
      placa: string
      /** Del más reciente al más antiguo, como los devuelve el contrato. */
      items: Deteccion[]
      /** Hay más de LIMITE_AVISTAMIENTOS en el rango (llegó `siguienteCursor`). */
      truncado: boolean
      /** null si /ubicacion-actual respondió 404 (o falló). */
      ubicacion: UbicacionActual | null
    }
  | {
      tipo: 'candidatas'
      patron: string
      candidatas: CandidataPlaca[]
      /** true si se llegó aquí por falta de coincidencia exacta (3a); false si el usuario usó comodines. */
      porFaltaDeExacta: boolean
    }
  | { tipo: 'vacio'; placa: string }

function mensajeCorto(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function tieneComodines(patron: string): boolean {
  return /[?*]/.test(patron)
}

async function buscarDifusa(patron: string, motivo: string): Promise<CandidataPlaca[]> {
  return placasApi.buscarPlacas({ patron, difusa: true, distanciaMaxima: 2, motivo })
}

export async function ejecutarBusqueda(p: ParametrosBusqueda): Promise<ResultadoBusqueda> {
  if (tieneComodines(p.placa)) {
    const candidatas = await buscarDifusa(p.placa, p.motivo)
    return candidatas.length > 0
      ? { tipo: 'candidatas', patron: p.placa, candidatas, porFaltaDeExacta: false }
      : { tipo: 'vacio', placa: p.placa }
  }

  // Ambas en paralelo: la ubicación puede dar 404 sin que sea un error de la búsqueda.
  const [avistamientos, ubicacion] = await Promise.all([
    placasApi.listarAvistamientos(p.placa, {
      desde: p.desde,
      hasta: p.hasta,
      motivo: p.motivo,
      limite: LIMITE_AVISTAMIENTOS,
    }),
    placasApi.obtenerUbicacionActual(p.placa, p.motivo).catch((err: unknown) => {
      // 404: sin avistamientos en el periodo retenido → no hay bloque "último
      // avistamiento". Cualquier otro fallo tampoco debe tumbar la búsqueda
      // principal: la línea de tiempo calcula la frescura en cliente.
      // Solo status y mensaje: el AxiosError completo incluye cabeceras (bearer), placa y motivo.
      if (statusDe(err) !== 404) {
        console.warn('ubicacion-actual no disponible', statusDe(err) ?? 'sin respuesta', mensajeCorto(err))
      }
      return null
    }),
  ])

  if (avistamientos.items.length > 0) {
    return {
      tipo: 'avistamientos',
      placa: p.placa,
      items: avistamientos.items,
      truncado: Boolean(avistamientos.siguienteCursor),
      ubicacion,
    }
  }

  // CU-03 · 3a: sin coincidencia exacta → difusa.
  const candidatas = await buscarDifusa(p.placa, p.motivo)
  // Una candidata con distancia 0 es la misma placa: ya sabemos que no tiene
  // avistamientos en el rango, así que no aporta.
  const utiles = candidatas.filter((c) => c.placaNormalizada !== p.placa)
  return utiles.length > 0
    ? { tipo: 'candidatas', patron: p.placa, candidatas: utiles, porFaltaDeExacta: true }
    : { tipo: 'vacio', placa: p.placa }
}
