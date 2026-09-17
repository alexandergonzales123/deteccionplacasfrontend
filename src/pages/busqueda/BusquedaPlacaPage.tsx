/**
 * CU-03 · Buscar un vehículo por placa (RF-04/RF-05, CA-04/CA-05) y
 * CU-04 · última ubicación conocida (RF-06, CA-06).
 *
 * La búsqueda se dispara SOLO al pulsar Buscar (cada consulta queda auditada,
 * CA-04): se usa `useMutation`, sin refetch por foco ni polling. `placa`,
 * `desde` y `hasta` se sincronizan en la URL para compartir/volver, pero NO el
 * motivo, y al cargar con params no se ejecuta nada: el usuario debe declarar
 * el motivo y pulsar Buscar.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, SearchX } from 'lucide-react'
import { startOfDay, subDays } from 'date-fns'
import * as configuracionApi from '@/api/configuracion'
import { mensajeDeError, statusDe } from '@/api/client'
import type { Deteccion, Frescura } from '@/api/types'
import { MapaAvistamientos, type MapaAvistamientosHandle, type PuntoMapa } from '@/components/mapa/MapaAvistamientos'
import { Button, Card, CardHeader, EmptyState, Skeleton } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { useReloj } from '@/hooks/useReloj'
import { PageHeader } from '@/layout/PageHeader'
import { cn } from '@/lib/cn'
import { TiempoRelativo } from '@/components/TiempoRelativo'
import { aDatetimeLocal, aFecha, formatoHora, segundosDesde } from '@/lib/fechas'
import { ESTILO_FRESCURA, frescuraDesdeSegundos } from '@/lib/frescura'
import { formatearPlaca, normalizarPlaca } from '@/lib/placas'
import { BarraBusqueda, type ValoresBusqueda } from './BarraBusqueda'
import { ejecutarBusqueda, LIMITE_AVISTAMIENTOS, type ResultadoBusqueda } from './ejecutarBusqueda'
import { LeyendaFrescura, LineaTiempo, type ItemLineaTiempo } from './LineaTiempo'
import { ModalEvidencia } from './ModalEvidencia'
import { PanelCandidatas } from './PanelCandidatas'

const ORDEN_FRESCURA: Record<Frescura, number> = { reciente: 0, probable: 1, antiguo: 2 }

/** Nunca se presenta más certeza que la que el tiempo transcurrido permite (CU-04). */
function peorFrescura(a: Frescura, b: Frescura): Frescura {
  return ORDEN_FRESCURA[a] >= ORDEN_FRESCURA[b] ? a : b
}

/** Param de fecha de la URL saneado: si no es una fecha válida, se usa el valor por defecto. */
function fechaDeParam(valor: string | null, porDefecto: Date): string {
  const d = valor ? aFecha(valor) : null
  return aDatetimeLocal(d ?? porDefecto)
}

function valoresIniciales(params: URLSearchParams): ValoresBusqueda {
  const ahora = new Date()
  return {
    placa: formatearPlaca(normalizarPlaca(params.get('placa') ?? '')),
    desde: fechaDeParam(params.get('desde'), startOfDay(subDays(ahora, 1))),
    hasta: fechaDeParam(params.get('hasta'), ahora),
    motivo: '',
  }
}

// Reloj grueso solo para lo derivado (frescura); los "hace X" tienen su propio
// reloj en <TiempoRelativo/> y así la página no re-renderiza cada segundo.
const INTERVALO_FRESCURA_MS = 10_000

export function BusquedaPlacaPage() {
  const ahora = useReloj(INTERVALO_FRESCURA_MS)
  const [searchParams, setSearchParams] = useSearchParams()
  const [valores, setValores] = useState<ValoresBusqueda>(() => valoresIniciales(searchParams))
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [evidencia, setEvidencia] = useState<Deteccion | null>(null)
  const mapaRef = useRef<MapaAvistamientosHandle>(null)

  const busqueda = useMutation({
    mutationFn: ejecutarBusqueda,
    // Sin reintentos: un timeout ya pudo quedar auditado; reintentar duplicaría el registro.
    retry: false,
    onSuccess: () => setSeleccionadoId(null),
  })

  const { mutate: ejecutar } = busqueda
  // `v` ya viene validado por BarraBusqueda (placa, rango con fechas válidas, motivo).
  const buscar = useCallback(
    (v: ValoresBusqueda) => {
      const desde = aFecha(v.desde)
      const hasta = aFecha(v.hasta)
      if (!desde || !hasta) return
      setSearchParams({ placa: v.placa, desde: v.desde, hasta: v.hasta }, { replace: true })
      ejecutar({ placa: v.placa, desde: desde.toISOString(), hasta: hasta.toISOString(), motivo: v.motivo })
    },
    [ejecutar, setSearchParams],
  )

  // Reintentar repite EXACTAMENTE la última ejecución (no el estado actual del formulario).
  const reintentar = useCallback(() => {
    if (busqueda.variables) ejecutar(busqueda.variables)
  }, [busqueda.variables, ejecutar])

  const cerrarEvidencia = useCallback(() => setEvidencia(null), [])

  const elegirCandidata = useCallback(
    (placaNormalizada: string) => {
      // El campo muestra la placa con guion; `buscar` recibe la normalizada.
      setValores({ ...valores, placa: formatearPlaca(placaNormalizada) })
      buscar({ ...valores, placa: placaNormalizada })
    },
    [valores, buscar],
  )

  const resultado: ResultadoBusqueda | undefined = busqueda.data

  // CU-03 · 4a: al no haber registros se informa el límite de retención vigente.
  const retencion = useQuery({
    queryKey: qk.configuracion.retencion,
    queryFn: configuracionApi.obtenerPoliticaRetencion,
    enabled: resultado?.tipo === 'vacio',
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  // ---- Derivados de los avistamientos --------------------------------------
  const items = useMemo<ItemLineaTiempo[]>(() => {
    if (resultado?.tipo !== 'avistamientos') return []
    // El contrato devuelve del más reciente al más antiguo; se reordena por si acaso.
    const desc = [...resultado.items].sort(
      (a, b) => new Date(b.capturadaEn).getTime() - new Date(a.capturadaEn).getTime(),
    )
    const total = desc.length
    return desc.map((deteccion, i) => ({ deteccion, orden: total - i }))
  }, [resultado])

  const puntos = useMemo<PuntoMapa[]>(
    () =>
      items.map(({ deteccion: d, orden }) => ({
        id: d.id,
        lat: d.camara.latitud,
        lng: d.camara.longitud,
        orden,
        esUltimo: orden === items.length,
        etiqueta: `${orden}. ${d.camara.nombre} · ${formatoHora(d.capturadaEn)}`,
      })),
    [items],
  )

  const ubicacion = resultado?.tipo === 'avistamientos' ? resultado.ubicacion : null
  const masReciente = items[0]?.deteccion ?? null
  // Fecha no parseable → Infinity → "antiguo": nunca se sobreestima la certeza.
  const antiguedadUltimo = segundosDesde(masReciente?.capturadaEn, ahora) ?? Number.POSITIVE_INFINITY
  // Frescura del ítem más reciente: la del servidor si corresponde al mismo
  // avistamiento, degradada por el tiempo transcurrido desde la consulta.
  const frescuraUltimo: Frescura = useMemo(() => {
    const cliente = frescuraDesdeSegundos(antiguedadUltimo)
    if (ubicacion && masReciente && ubicacion.avistamiento.id === masReciente.id) {
      return peorFrescura(ubicacion.frescura, cliente)
    }
    return cliente
  }, [ubicacion, masReciente, antiguedadUltimo])

  // "Último avistamiento · hace X": del endpoint dedicado (CU-04) si respondió;
  // si no (404 u otro fallo), del ítem más reciente del rango.
  const ultimoAvistamiento = ubicacion?.avistamiento ?? masReciente
  const antiguedadGlobal = segundosDesde(ultimoAvistamiento?.capturadaEn, ahora) ?? Number.POSITIVE_INFINITY
  const frescuraGlobal: Frescura = ubicacion
    ? peorFrescura(ubicacion.frescura, frescuraDesdeSegundos(antiguedadGlobal))
    : frescuraUltimo

  function seleccionar(d: Deteccion) {
    setSeleccionadoId(d.id)
    mapaRef.current?.centrarEn(d.id)
  }

  // ---- Error ---------------------------------------------------------------
  const mensajeError = busqueda.isError
    ? statusDe(busqueda.error) === 403
      ? 'Su rol no permite consultar placas'
      : mensajeDeError(busqueda.error, 'No se pudo completar la búsqueda.')
    : null

  const resumen =
    resultado?.tipo === 'avistamientos' ? (
      <span>
        <span className="font-mono font-semibold text-fg">
          {resultado.truncado ? `${LIMITE_AVISTAMIENTOS}+` : items.length}
        </span>{' '}
        {items.length === 1 && !resultado.truncado ? 'avistamiento encontrado' : 'avistamientos encontrados'} de{' '}
        <span className="font-mono text-fg">{formatearPlaca(resultado.placa)}</span>
      </span>
    ) : resultado?.tipo === 'candidatas' ? (
      <span>
        <span className="font-mono font-semibold text-fg">{resultado.candidatas.length}</span> placas similares
      </span>
    ) : resultado?.tipo === 'vacio' ? (
      <span>
        <span className="font-mono font-semibold text-fg">0</span> avistamientos encontrados
      </span>
    ) : null

  return (
    <>
      <PageHeader titulo="Búsqueda por placa" subtitulo="Consulta el historial de avistamientos de un vehículo" />

      <BarraBusqueda
        valores={valores}
        onCambiar={setValores}
        onBuscar={buscar}
        buscando={busqueda.isPending}
        resumen={resumen}
      />

      {mensajeError ? (
        <div
          role="alert"
          className="mb-6 flex items-start justify-between gap-3 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {mensajeError}
          </span>
          {statusDe(busqueda.error) !== 403 ? (
            <Button variante="secundario" tamano="sm" className="min-h-[44px]" onClick={reintentar}>
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}

      {busqueda.isPending ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[420px]" />
          <Skeleton className="h-[420px]" />
        </div>
      ) : resultado?.tipo === 'avistamientos' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader
              titulo="Recorrido en el mapa"
              subtitulo={`${items.length} puntos en orden cronológico · 1 = más antiguo`}
              acciones={
                ultimoAvistamiento ? (
                  <span
                    className={cn('inline-flex items-center gap-2 text-xs font-semibold', ESTILO_FRESCURA[frescuraGlobal].texto)}
                    title={ubicacion?.advertencia ?? 'Último punto donde el vehículo fue visto. No equivale a su ubicación actual.'}
                  >
                    <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
                    Último avistamiento · <TiempoRelativo valor={ultimoAvistamiento.capturadaEn} />
                  </span>
                ) : null
              }
            />
            <div className="p-3">
              <MapaAvistamientos ref={mapaRef} puntos={puntos} polilinea className="h-[420px]" />
            </div>
            {ubicacion?.advertencia ? (
              <p className="border-t border-border px-5 py-3 text-xs text-fgMuted">{ubicacion.advertencia}</p>
            ) : null}
          </Card>

          <Card>
            <CardHeader titulo="Línea de tiempo de avistamientos" subtitulo={<LeyendaFrescura />} />
            {resultado.truncado ? (
              <p className="border-b border-border bg-warn/[0.06] px-5 py-2 text-xs text-warn">
                Se muestran los {LIMITE_AVISTAMIENTOS} más recientes del rango. Acote las fechas para ver el resto.
              </p>
            ) : null}
            <div className="max-h-[560px] overflow-y-auto">
              <LineaTiempo
                items={items}
                frescuraUltimo={frescuraUltimo}
                seleccionadoId={seleccionadoId}
                onSeleccionar={seleccionar}
                onVerEvidencia={setEvidencia}
              />
            </div>
          </Card>
        </div>
      ) : resultado?.tipo === 'candidatas' ? (
        <PanelCandidatas
          patron={resultado.patron}
          candidatas={resultado.candidatas}
          porFaltaDeExacta={resultado.porFaltaDeExacta}
          onElegir={elegirCandidata}
        />
      ) : resultado?.tipo === 'vacio' ? (
        <Card>
          <EmptyState
            icono={SearchX}
            titulo="No hay registros en el periodo consultado"
            descripcion={
              <>
                No se encontraron avistamientos de{' '}
                <span className="font-mono text-fg">{formatearPlaca(resultado.placa)}</span> ni placas similares.
                {retencion.data ? (
                  <>
                    {' '}
                    Las detecciones sin alerta se conservan {retencion.data.diasDeteccionesSinAlerta} días; fuera de ese
                    plazo ya fueron purgadas.
                  </>
                ) : retencion.isError ? (
                  ' No se pudo consultar el plazo de retención vigente.'
                ) : null}
              </>
            }
          />
        </Card>
      ) : !mensajeError ? (
        <Card>
          <EmptyState
            titulo="Ingrese una placa y el motivo de la consulta"
            descripcion="Los resultados se dibujan en el mapa en orden cronológico junto con la línea de tiempo de avistamientos."
          />
        </Card>
      ) : null}

      <ModalEvidencia deteccion={evidencia} onCerrar={cerrarEvidencia} />
    </>
  )
}
