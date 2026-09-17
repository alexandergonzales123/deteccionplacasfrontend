/**
 * CU-10 · Auditoría de consultas (rol admin). GET /auditoria/consultas
 * paginado por cursor con filtros `usuarioId`, `placa`, `desde`, `hasta` en
 * la URL. Sin polling: es una consulta administrativa. Los registros son
 * inmutables (no hay PUT/DELETE en el contrato).
 *
 * Incluye la política de retención (CU-11) con edición para admin.
 */
import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, ClipboardList, Download, Lock } from 'lucide-react'
import { endOfDay, isValid, parseISO, startOfDay } from 'date-fns'
import * as auditoriaApi from '@/api/auditoria'
import * as configuracionApi from '@/api/configuracion'
import { mensajeDeError } from '@/api/client'
import { Button, Card, CardHeader, EmptyState, Input, Skeleton } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { PageHeader } from '@/layout/PageHeader'
import { descargarArchivoTexto, esUuid, registrosACSV } from '@/lib/auditoria'
import { aDatetimeLocalSegundos, aFecha, claveDia, formatoFechaCorta } from '@/lib/fechas'
import { normalizarPlaca, PATRON_PLACA_NORMALIZADA } from '@/lib/placas'
import { CardConsultasDia } from './CardConsultasDia'
import { CardRetencion } from './CardRetencion'
import { ModalRetencion } from './ModalRetencion'
import { TablaAuditoria } from './TablaAuditoria'

const LIMITE_PAGINA = 50

/** "2026-09-16" válido o null. */
function diaDeParam(v: string | null): string | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  return isValid(parseISO(v)) ? v : null
}

interface Filtros {
  dia: string
  /** Valores de `<input type="datetime-local">`: derivados del día salvo que el usuario los cambie. */
  desde: string
  hasta: string
  usuarioId: string
  placa: string
}

function filtrosDeParams(params: URLSearchParams): Filtros {
  const dia = diaDeParam(params.get('dia')) ?? claveDia(new Date())
  const inicio = startOfDay(parseISO(dia))
  const fin = endOfDay(parseISO(dia))
  const desdeParam = params.get('desde')
  const hastaParam = params.get('hasta')
  return {
    dia,
    desde: desdeParam && aFecha(desdeParam) ? desdeParam : aDatetimeLocalSegundos(inicio),
    hasta: hastaParam && aFecha(hastaParam) ? hastaParam : aDatetimeLocalSegundos(fin),
    usuarioId: params.get('usuarioId') ?? '',
    placa: normalizarPlaca(params.get('placa') ?? '').replace(/[?*]/g, ''),
  }
}

type ErroresFiltro = Partial<Record<'usuarioId' | 'placa' | 'rango', string>>

export function AuditoriaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filtros = useMemo(() => filtrosDeParams(searchParams), [searchParams])
  const hoy = claveDia(new Date())
  const esHoy = filtros.dia === hoy

  // Solo se envían al backend filtros válidos: un uuid mal formado o un rango
  // invertido se retienen en cliente con su error, sin disparar la consulta.
  const erroresUrl = useMemo<ErroresFiltro>(() => {
    const e: ErroresFiltro = {}
    if (filtros.usuarioId && !esUuid(filtros.usuarioId)) e.usuarioId = 'Debe ser un identificador con formato uuid.'
    if (filtros.placa && !PATRON_PLACA_NORMALIZADA.test(filtros.placa)) e.placa = 'Entre 6 y 8 letras o números.'
    const d = aFecha(filtros.desde)
    const h = aFecha(filtros.hasta)
    if (!d || !h) e.rango = 'Fecha inválida.'
    else if (d.getTime() > h.getTime()) e.rango = '"Desde" debe ser anterior a "Hasta".'
    return e
  }, [filtros])
  const filtrosValidos = Object.keys(erroresUrl).length === 0

  const paramsApi = useMemo(
    () => ({
      usuarioId: filtros.usuarioId || undefined,
      placa: filtros.placa || undefined,
      desde: aFecha(filtros.desde)?.toISOString(),
      hasta: aFecha(filtros.hasta)?.toISOString(),
    }),
    [filtros],
  )

  const lista = useInfiniteQuery({
    queryKey: qk.auditoria.lista(paramsApi),
    queryFn: ({ pageParam }) => auditoriaApi.listarConsultasAuditoria({ ...paramsApi, limite: LIMITE_PAGINA, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.siguienteCursor ?? undefined,
    enabled: filtrosValidos,
  })
  const registros = useMemo(() => lista.data?.pages.flatMap((p) => p.items) ?? [], [lista.data])

  const retencion = useQuery({
    queryKey: qk.configuracion.retencion,
    queryFn: configuracionApi.obtenerPoliticaRetencion,
    staleTime: 60_000,
  })
  const [editando, setEditando] = useState(false)
  const cerrarEdicion = useCallback(() => setEditando(false), [])

  // ---- Formulario de filtros (estado local; se aplica al enviar) -----------
  const [borrador, setBorrador] = useState<Filtros>(filtros)
  const [erroresForm, setErroresForm] = useState<ErroresFiltro>({})
  // Si la URL cambia por fuera (día, atrás/adelante), el formulario la sigue.
  const [filtrosSincronizados, setFiltrosSincronizados] = useState(filtros)
  if (filtrosSincronizados !== filtros) {
    setFiltrosSincronizados(filtros)
    setBorrador(filtros)
    setErroresForm({})
  }

  function escribirParams(f: Filtros) {
    const next: Record<string, string> = {}
    if (f.dia !== hoy) next.dia = f.dia
    const inicio = aDatetimeLocalSegundos(startOfDay(parseISO(f.dia)))
    const fin = aDatetimeLocalSegundos(endOfDay(parseISO(f.dia)))
    if (f.desde !== inicio) next.desde = f.desde
    if (f.hasta !== fin) next.hasta = f.hasta
    if (f.usuarioId) next.usuarioId = f.usuarioId
    if (f.placa) next.placa = f.placa
    setSearchParams(next, { replace: true })
  }

  function cambiarDia(dia: string) {
    const valido = diaDeParam(dia)
    if (!valido) return
    // Un día nuevo restablece el rango a 00:00–23:59:59 de ese día.
    escribirParams({
      ...filtros,
      dia: valido,
      desde: aDatetimeLocalSegundos(startOfDay(parseISO(valido))),
      hasta: aDatetimeLocalSegundos(endOfDay(parseISO(valido))),
    })
  }

  function aplicarFiltros(e: FormEvent) {
    e.preventDefault()
    const usuarioId = borrador.usuarioId.trim()
    const placa = borrador.placa
    const errs: ErroresFiltro = {}
    if (usuarioId && !esUuid(usuarioId)) errs.usuarioId = 'Debe ser un identificador con formato uuid.'
    if (placa && !PATRON_PLACA_NORMALIZADA.test(placa)) errs.placa = 'Entre 6 y 8 letras o números.'
    const d = aFecha(borrador.desde)
    const h = aFecha(borrador.hasta)
    if (!borrador.desde || !borrador.hasta || !d || !h) errs.rango = 'Indique el rango de fechas.'
    else if (d.getTime() > h.getTime()) errs.rango = '"Desde" debe ser anterior a "Hasta".'
    setErroresForm(errs)
    if (Object.keys(errs).length > 0) return
    escribirParams({ ...borrador, usuarioId, placa })
  }

  function limpiarFiltros() {
    escribirParams({
      ...filtros,
      usuarioId: '',
      placa: '',
      desde: aDatetimeLocalSegundos(startOfDay(parseISO(filtros.dia))),
      hasta: aDatetimeLocalSegundos(endOfDay(parseISO(filtros.dia))),
    })
  }

  function exportarCSV() {
    descargarArchivoTexto(registrosACSV(registros), `auditoria-${filtros.dia}.csv`)
  }

  const etiquetaDia = esHoy ? 'hoy' : formatoFechaCorta(parseISO(filtros.dia))
  const hayFiltrosExtra =
    Boolean(filtros.usuarioId) ||
    Boolean(filtros.placa) ||
    filtros.desde !== aDatetimeLocalSegundos(startOfDay(parseISO(filtros.dia))) ||
    filtros.hasta !== aDatetimeLocalSegundos(endOfDay(parseISO(filtros.dia)))

  return (
    <>
      <PageHeader
        titulo="Auditoría"
        subtitulo="Quién consultó qué placa, cuándo y con qué motivo"
        acciones={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Día a consultar"
              type="date"
              value={filtros.dia}
              max={hoy}
              onChange={(e) => cambiarDia(e.target.value)}
              className="min-h-[44px] w-[170px] font-mono"
            />
            {/* TODO(contrato): la acción 'exportacion' del enum sugiere un endpoint server-side que no está definido; se exporta en cliente lo cargado. */}
            <Button
              variante="secundario"
              tamano="lg"
              className="min-h-[44px]"
              onClick={exportarCSV}
              disabled={registros.length === 0}
              title={registros.length === 0 ? 'No hay registros cargados para exportar' : `Exporta ${registros.length} registros cargados`}
            >
              <Download className="h-4 w-4" aria-hidden />
              Exportar reporte
            </Button>
          </div>
        }
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-5" aria-label="Resumen">
        <CardRetencion
          className="lg:col-span-3"
          politica={retencion.data}
          cargando={retencion.isPending}
          error={retencion.isError ? mensajeDeError(retencion.error, 'No se pudo cargar la política de retención.') : null}
          onEditar={retencion.data ? () => setEditando(true) : undefined}
        />
        <CardConsultasDia
          className="lg:col-span-2"
          registros={registros}
          cargando={lista.isPending && filtrosValidos}
          truncado={Boolean(lista.hasNextPage)}
          etiquetaDia={etiquetaDia}
        />
      </section>

      <Card>
        <CardHeader
          titulo="Registro de consultas"
          subtitulo={
            lista.data
              ? `${registros.length}${lista.hasNextPage ? '+' : ''} ${registros.length === 1 && !lista.hasNextPage ? 'registro' : 'registros'} · ${etiquetaDia}`
              : undefined
          }
          className="flex-col sm:flex-row sm:items-center"
          acciones={
            // CU-10 · regla de negocio: inmutables.
            <span className="inline-flex items-center gap-1.5 text-xs text-fgMuted">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Registros inmutables · no editables ni eliminables
            </span>
          }
        />

        <form
          onSubmit={aplicarFiltros}
          noValidate
          aria-label="Filtros del registro"
          className="grid gap-4 border-b border-border px-5 py-4 md:grid-cols-12 md:items-start"
        >
          <div className="md:col-span-3">
            {/* TODO(contrato): no hay endpoint de listado de usuarios; se filtra por `usuarioId` (uuid) tal cual. */}
            <Input
              label="Usuario"
              placeholder="uuid del usuario"
              autoComplete="off"
              spellCheck={false}
              value={borrador.usuarioId}
              onChange={(e) => {
                setBorrador((b) => ({ ...b, usuarioId: e.target.value }))
                if (erroresForm.usuarioId) setErroresForm((p) => ({ ...p, usuarioId: undefined }))
              }}
              error={erroresForm.usuarioId ?? erroresUrl.usuarioId}
              className="min-h-[44px] font-mono text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Placa"
              mono
              placeholder="AKQ-198"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={9}
              value={borrador.placa}
              onChange={(e) => {
                setBorrador((b) => ({ ...b, placa: normalizarPlaca(e.target.value).replace(/[?*]/g, '') }))
                if (erroresForm.placa) setErroresForm((p) => ({ ...p, placa: undefined }))
              }}
              error={erroresForm.placa ?? erroresUrl.placa}
              className="min-h-[44px]"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Desde"
              type="datetime-local"
              step={1}
              value={borrador.desde}
              max={borrador.hasta || undefined}
              onChange={(e) => {
                setBorrador((b) => ({ ...b, desde: e.target.value }))
                if (erroresForm.rango) setErroresForm((p) => ({ ...p, rango: undefined }))
              }}
              error={erroresForm.rango ?? erroresUrl.rango}
              className="min-h-[44px]"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Hasta"
              type="datetime-local"
              step={1}
              value={borrador.hasta}
              min={borrador.desde || undefined}
              onChange={(e) => {
                setBorrador((b) => ({ ...b, hasta: e.target.value }))
                if (erroresForm.rango) setErroresForm((p) => ({ ...p, rango: undefined }))
              }}
              className="min-h-[44px]"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-3">
            <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-transparent md:block" aria-hidden>
              Aplicar
            </span>
            <div className="flex gap-2">
              <Button type="submit" tamano="lg" className="min-h-[44px] flex-1">
                Filtrar
              </Button>
              {hayFiltrosExtra ? (
                <Button type="button" variante="secundario" tamano="lg" className="min-h-[44px]" onClick={limpiarFiltros}>
                  Limpiar
                </Button>
              ) : null}
            </div>
          </div>
        </form>

        {lista.isError ? (
          <div role="alert" className="flex items-center gap-2 border-b border-border bg-danger/10 px-5 py-3 text-sm text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {mensajeDeError(lista.error, 'No se pudo cargar el registro de auditoría.')}
            {lista.data ? <span className="text-fgMuted"> Se muestran los últimos datos recibidos.</span> : null}
          </div>
        ) : null}

        {!filtrosValidos ? (
          <EmptyState icono={AlertTriangle} tono="advertencia" titulo="Filtros inválidos" descripcion="Corrija los filtros marcados para consultar el registro." />
        ) : lista.isPending ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : registros.length === 0 ? (
          lista.isError ? (
            // Sin polling en auditoría: el reintento es manual.
            <EmptyState
              icono={ClipboardList}
              tono="error"
              titulo="No se pudo cargar el registro"
              descripcion="Vuelva a intentarlo."
              accion={
                <Button variante="secundario" className="min-h-[44px]" onClick={() => void lista.refetch()} cargando={lista.isFetching}>
                  Reintentar
                </Button>
              }
            />
          ) : (
            <EmptyState
              icono={ClipboardList}
              titulo="No hay consultas registradas en el periodo"
              descripcion={hayFiltrosExtra ? 'Pruebe con otros filtros o amplíe el rango.' : 'Seleccione otro día en el encabezado.'}
            />
          )
        ) : (
          <TablaAuditoria registros={registros} />
        )}

        {lista.hasNextPage ? (
          <div className="flex justify-center border-t border-border px-5 py-3">
            <Button variante="secundario" className="min-h-[44px]" onClick={() => void lista.fetchNextPage()} cargando={lista.isFetchingNextPage}>
              Cargar más
            </Button>
          </div>
        ) : null}
      </Card>

      {editando && retencion.data ? <ModalRetencion politica={retencion.data} onCerrar={cerrarEdicion} /> : null}
    </>
  )
}
