/**
 * CU-07 · Administrar cámaras (admin) y CU-09 · salud de la red (visor+).
 * Listado con polling cada 30 s. CA-11: el estado lo determina el heartbeat,
 * nunca la ausencia de detecciones; por eso la columna "Última actividad"
 * muestra `ultimoHeartbeatEn` y no la última detección.
 */
import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Camera, CameraOff, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import * as camarasApi from '@/api/camaras'
import { mensajeDeError } from '@/api/client'
import type { Camara, CamaraCreada, EstadoCamara } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { tienePermiso } from '@/auth/permisos'
import { TiempoRelativo } from '@/components/TiempoRelativo'
import { Button, Card, CardHeader, Chip, EmptyState, Modal, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { useReloj } from '@/hooks/useReloj'
import { PageHeader } from '@/layout/PageHeader'
import { cn } from '@/lib/cn'
import { formatoAbsoluto, segundosDesde } from '@/lib/fechas'
import { ESTADOS_CAMARA, ETIQUETA_ESTADO, TONO_ESTADO, etiquetaLente, formatoCoordenadas, UMBRAL_HEARTBEAT_SEG } from './estadoCamara'
import { FormularioCamaraModal } from './FormularioCamaraModal'
import { ModalApiKey } from './ModalApiKey'
import { useCamarasCompletas } from './useCamarasCompletas'

const INTERVALO_LISTA_MS = 30_000
// Reloj grueso solo para colorear el heartbeat; los "hace X" llevan su propio reloj.
const INTERVALO_RELOJ_MS = 10_000

function esEstado(v: string | null): v is EstadoCamara {
  return v !== null && (ESTADOS_CAMARA as string[]).includes(v)
}

function MiniStat({ etiqueta, valor, tono, cargando }: { etiqueta: string; valor: string; tono?: 'ok' | 'warn' | 'muted'; cargando: boolean }) {
  const color = tono === 'ok' ? 'text-ok' : tono === 'warn' ? 'text-warn' : tono === 'muted' ? 'text-fgMuted' : 'text-fg'
  return (
    <Card className="px-5 py-4">
      {cargando ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className={cn('flex items-center gap-2 font-mono text-3xl font-bold leading-none', color)}>
          {tono ? <span className="h-2.5 w-2.5 rounded-full bg-current" aria-hidden /> : null}
          {valor}
        </p>
      )}
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-fgMuted">{etiqueta}</p>
    </Card>
  )
}

export function CamarasPage() {
  const ahora = useReloj(INTERVALO_RELOJ_MS)
  const { usuario } = useAuth()
  const esAdmin = tienePermiso(usuario?.rol, 'admin')
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const filtro = esEstado(searchParams.get('estado')) ? (searchParams.get('estado') as EstadoCamara) : undefined

  // Totales siempre sobre el listado sin filtro; la tabla usa el query param `estado` del contrato.
  const todas = useCamarasCompletas(undefined, INTERVALO_LISTA_MS)
  const filtradas = useCamarasCompletas(filtro, INTERVALO_LISTA_MS)
  const lista = filtro ? filtradas : todas

  const [modalForm, setModalForm] = useState<{ abierto: boolean; camara: Camara | null }>({ abierto: false, camara: null })
  const [apiKey, setApiKey] = useState<{ key: string; nombre: string } | null>(null)
  const [aEliminar, setAEliminar] = useState<Camara | null>(null)

  const eliminar = useMutation({
    mutationFn: (id: string) => camarasApi.darDeBajaCamara(id),
    onSuccess: () => {
      setAEliminar(null)
      void queryClient.invalidateQueries({ queryKey: qk.camaras.todas })
    },
  })
  const eliminando = eliminar.isPending

  // Callbacks estables para los modales (ver nota en Modal.tsx).
  const cerrarForm = useCallback(() => setModalForm({ abierto: false, camara: null }), [])
  const cerrarApiKey = useCallback(() => setApiKey(null), [])
  const cerrarBaja = useCallback(() => {
    if (!eliminando) setAEliminar(null)
  }, [eliminando])

  const resumen = useMemo(() => {
    const items = todas.data?.items ?? []
    return {
      total: items.length,
      activas: items.filter((c) => c.estado === 'activa').length,
      mantenimiento: items.filter((c) => c.estado === 'mantenimiento').length,
      inactivas: items.filter((c) => c.estado === 'inactiva').length,
      truncado: todas.data?.truncado ?? false,
    }
  }, [todas.data])

  function cambiarFiltro(estado: EstadoCamara | undefined) {
    setSearchParams(estado ? { estado } : {}, { replace: true })
  }

  const alCrear = useCallback((creada: CamaraCreada) => {
    setModalForm({ abierto: false, camara: null })
    if (creada.apiKey) {
      setApiKey({ key: creada.apiKey, nombre: creada.nombre })
    }
    // TODO(contrato): si el backend no devuelve `apiKey` en el 201, el
    // dispositivo no podrá configurarse desde aquí; se avisa en consola.
    else console.warn('POST /camaras respondió sin apiKey', creada.id)
  }, [])

  const items = lista.data?.items ?? []
  const mas = (resumen.truncado ? '+' : '')

  return (
    <>
      <PageHeader
        titulo="Cámaras"
        subtitulo="Registro y estado de los puntos de captura"
        acciones={
          esAdmin ? (
            <Button className="min-h-[44px]" onClick={() => setModalForm({ abierto: true, camara: null })}>
              <Plus className="h-4 w-4" aria-hidden />
              Agregar cámara
            </Button>
          ) : null
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Resumen de cámaras">
        <MiniStat etiqueta="Cámaras totales" valor={`${resumen.total}${mas}`} cargando={todas.isPending} />
        <MiniStat etiqueta="Activas" valor={String(resumen.activas)} tono="ok" cargando={todas.isPending} />
        <MiniStat etiqueta="En mantenimiento" valor={String(resumen.mantenimiento)} tono="warn" cargando={todas.isPending} />
        <MiniStat etiqueta={resumen.inactivas === 1 ? 'Inactiva' : 'Inactivas'} valor={String(resumen.inactivas)} tono="muted" cargando={todas.isPending} />
      </section>

      {lista.isError ? (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {mensajeDeError(lista.error, 'No se pudo cargar el listado de cámaras.')}
          {lista.data ? <span className="text-fgMuted"> Se muestran los últimos datos recibidos.</span> : null}
        </div>
      ) : null}

      <Card>
        <CardHeader
          titulo="Listado"
          subtitulo={filtro ? `Filtrado: ${ETIQUETA_ESTADO[filtro].toLowerCase()}` : 'Todas las cámaras registradas'}
          acciones={
            <div role="tablist" aria-label="Filtrar por estado" className="flex flex-wrap gap-1">
              {([undefined, ...ESTADOS_CAMARA] as Array<EstadoCamara | undefined>).map((est) => {
                const activo = filtro === est
                return (
                  <button
                    key={est ?? 'todas'}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => cambiarFiltro(est)}
                    className={cn(
                      'min-h-[44px] rounded-md px-3 text-xs font-semibold transition-colors',
                      activo ? 'bg-primary/15 text-primary' : 'text-fgMuted hover:bg-panelHover hover:text-fg',
                    )}
                  >
                    {est ? ETIQUETA_ESTADO[est] : 'Todas'}
                  </button>
                )
              })}
            </div>
          }
        />

        {lista.isPending ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          lista.isError ? (
            <EmptyState icono={CameraOff} tono="error" titulo="No se pudieron cargar las cámaras" descripcion="Se reintentará automáticamente." />
          ) : (
            <EmptyState
              icono={Camera}
              titulo={filtro ? `No hay cámaras en estado "${ETIQUETA_ESTADO[filtro].toLowerCase()}"` : 'Aún no hay cámaras registradas'}
              descripcion={!filtro && esAdmin ? 'Registre la primera cámara con el botón "Agregar cámara".' : undefined}
            />
          )
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Cámara / Ubicación</Th>
                <Th>Coordenadas</Th>
                <Th>Lente</Th>
                <Th>Estado</Th>
                <Th>Última actividad</Th>
                {esAdmin ? <Th className="text-right">Acciones</Th> : null}
              </tr>
            </THead>
            <TBody>
              {items.map((c) => {
                const segHb = segundosDesde(c.ultimoHeartbeatEn, ahora)
                return (
                  <Tr key={c.id} className="hover:bg-panelHover">
                    <Td>
                      <Link
                        to={`/camaras/${encodeURIComponent(c.id)}`}
                        className="flex min-h-[44px] items-center gap-2 font-semibold text-fg hover:text-primary"
                      >
                        <MapPin className="h-4 w-4 shrink-0 text-fgDim" aria-hidden />
                        {c.nombre}
                      </Link>
                    </Td>
                    <Td className="font-mono text-xs text-fgMuted">{formatoCoordenadas(c.latitud, c.longitud)}</Td>
                    <Td className="text-fgMuted">{etiquetaLente(c.tipoLente)}</Td>
                    <Td>
                      <Chip tono={TONO_ESTADO[c.estado]} punto>
                        {ETIQUETA_ESTADO[c.estado]}
                      </Chip>
                    </Td>
                    <Td>
                      {c.ultimoHeartbeatEn ? (
                        <TiempoRelativo
                          valor={c.ultimoHeartbeatEn}
                          title={`Último heartbeat: ${formatoAbsoluto(c.ultimoHeartbeatEn)}`}
                          className={cn('font-mono text-xs', segHb !== null && segHb < UMBRAL_HEARTBEAT_SEG ? 'text-ok' : 'text-fgMuted')}
                        />
                      ) : (
                        <span className="text-xs text-fgDim">sin heartbeat</span>
                      )}
                    </Td>
                    {esAdmin ? (
                      <Td className="text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => setModalForm({ abierto: true, camara: c })}
                            aria-label={`Editar ${c.nombre}`}
                            title="Editar"
                            className="flex h-11 w-11 items-center justify-center rounded-md text-fgMuted hover:bg-panelHover hover:text-fg"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAEliminar(c)}
                            aria-label={`Dar de baja ${c.nombre}`}
                            title="Dar de baja"
                            className="flex h-11 w-11 items-center justify-center rounded-md text-fgMuted hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </Td>
                    ) : null}
                  </Tr>
                )
              })}
            </TBody>
          </Table>
        )}
        {lista.data?.truncado ? (
          <p className="border-t border-border px-5 py-2 text-xs text-warn">
            Se alcanzó el tope de 1000 cámaras listadas; puede haber más no mostradas.
          </p>
        ) : null}
      </Card>

      {esAdmin ? (
        <>
          {modalForm.abierto ? (
            <FormularioCamaraModal
              camara={modalForm.camara}
              onCerrar={cerrarForm}
              onCreada={alCrear}
              onActualizada={cerrarForm}
            />
          ) : null}
          <ModalApiKey apiKey={apiKey?.key ?? null} nombreCamara={apiKey?.nombre ?? ''} onCerrar={cerrarApiKey} />
          <Modal
            abierto={aEliminar !== null}
            onCerrar={cerrarBaja}
            titulo="Dar de baja la cámara"
            descripcion={aEliminar ? `"${aEliminar.nombre}"` : undefined}
            tamano="sm"
            pie={
              <>
                <Button variante="secundario" className="min-h-[44px]" onClick={cerrarBaja} disabled={eliminando}>
                  Cancelar
                </Button>
                <Button
                  variante="peligro"
                  className="min-h-[44px]"
                  cargando={eliminando}
                  onClick={() => aEliminar && eliminar.mutate(aEliminar.id)}
                >
                  Dar de baja
                </Button>
              </>
            }
          >
            <p className="text-sm text-fg">
              Es una baja lógica: las detecciones históricas conservan la referencia a esta cámara.
            </p>
            {eliminar.isError ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {mensajeDeError(eliminar.error, 'No se pudo dar de baja la cámara.')}
              </p>
            ) : null}
          </Modal>
        </>
      ) : null}
    </>
  )
}
