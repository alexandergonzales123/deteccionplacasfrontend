/**
 * CU-12 · paso 3: respuesta apilada por prioridad.
 *  1. Vigilancia (3a: bloque rojo dominante con motivo y expediente).
 *  2. Última vez vista (CU-04: nunca "ubicación actual" sin calificar).
 *  3. Similares si no hay registros de la placa exacta.
 */
import { AlertOctagon, AlertTriangle, ChevronRight, HelpCircle, MapPin, RotateCcw, ScanSearch, ShieldCheck } from 'lucide-react'
import type { CandidataPlaca } from '@/api/types'
import { TiempoRelativo } from '@/components/TiempoRelativo'
import { Button, Card, CardBody, CardHeader, Chip } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatoAbsoluto } from '@/lib/fechas'
import { ESTILO_FRESCURA, frescuraSegura } from '@/lib/frescura'
import { formatearPlaca } from '@/lib/placas'
import { estaVencida, etiquetaMotivo } from '@/lib/watchlist'
import type { ResultadoCampo as Resultado } from './consultarCampo'

interface Props {
  resultado: Resultado
  onNuevaConsulta: () => void
  /** Similares (difusa=true, distancia 1): se piden solo al pulsar el botón. */
  similares: { data?: CandidataPlaca[]; cargando: boolean; error: string | null }
  onBuscarSimilares: () => void
  onElegirPlaca: (placaNormalizada: string) => void
}

function BloqueVigilancia({ resultado }: { resultado: Resultado }) {
  const placa = formatearPlaca(resultado.placa)

  if (resultado.vigilancia === 'si') {
    return (
      // CU-12 · 3a: inequívoco y visualmente dominante.
      <section
        role="alert"
        aria-label="Placa en vigilancia"
        className="rounded-lg border-2 border-danger bg-danger px-5 py-6 text-white shadow-[0_0_0_4px_rgba(239,68,68,0.25)]"
        data-testid="campo-vigilancia-si"
      >
        <p className="flex items-center justify-center gap-2 text-center text-2xl font-black uppercase tracking-wide">
          <AlertOctagon className="h-7 w-7 shrink-0" aria-hidden />
          Placa en vigilancia
        </p>
        <p className="mt-3 text-center font-mono text-3xl font-black tracking-[0.2em]">{placa}</p>

        {resultado.entradas.length > 0 ? (
          <ul className="mt-5 space-y-3" aria-label="Motivos de vigilancia">
            {resultado.entradas.map((w) => (
              <li key={w.id} className="rounded-md bg-black/25 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Sobre fondo rojo el ChipMotivo (rojo/ámbar) no contrasta: etiqueta en blanco. */}
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-bold uppercase tracking-wide text-danger">
                    {etiquetaMotivo(w.motivo)}
                  </span>
                  {estaVencida(w) ? (
                    <span className="rounded-full border border-white/50 px-2.5 py-0.5 font-mono text-xs font-semibold text-white/80">Vencida</span>
                  ) : null}
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-white/70">Expediente</p>
                <p className="font-mono text-base font-bold">{w.referenciaExpediente}</p>
                {w.notas ? <p className="mt-1.5 text-sm text-white/90">{w.notas}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          // `enWatchlist` vino true pero el cruce con /watchlist no devolvió la entrada
          // (lista incompleta o sin conexión). TODO(contrato): ver consultarCampo.ts.
          <p className="mt-5 rounded-md bg-black/25 px-4 py-3 text-sm">
            No se pudo obtener el motivo ni el expediente. Consulte a la central.
          </p>
        )}

        {/* R-05: nunca una intervención automática; confirmación humana. */}
        <p className="mt-5 flex items-start gap-2 text-sm font-semibold">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Confirme visualmente la placa antes de intervenir. Reporte a la central.
        </p>
      </section>
    )
  }

  if (resultado.vigilancia === 'no') {
    return (
      <section
        role="status"
        className="rounded-lg border border-ok/40 bg-ok/10 px-5 py-5"
        data-testid="campo-vigilancia-no"
      >
        <p className="flex items-center gap-2 text-lg font-bold text-ok">
          <ShieldCheck className="h-6 w-6 shrink-0" aria-hidden />
          Sin vigilancia activa
        </p>
        <p className="mt-2 font-mono text-3xl font-black tracking-[0.2em] text-fg">{placa}</p>
      </section>
    )
  }

  return (
    <section
      role="alert"
      className="rounded-lg border border-warn/50 bg-warn/10 px-5 py-5"
      data-testid="campo-vigilancia-desconocida"
    >
      <p className="flex items-center gap-2 text-lg font-bold text-warn">
        <HelpCircle className="h-6 w-6 shrink-0" aria-hidden />
        Vigilancia no verificada
      </p>
      <p className="mt-2 font-mono text-3xl font-black tracking-[0.2em] text-fg">{placa}</p>
      <p className="mt-2 text-sm text-fgMuted">
        No se pudo comprobar la lista de vigilancia. No asuma que la placa está libre; consulte a la central.
      </p>
    </section>
  )
}

function BloqueUltimaVezVista({ resultado }: { resultado: Resultado }) {
  const u = resultado.ubicacion
  if (u === 'no_disponible') {
    return (
      <Card className="border-l-4 border-warn" data-testid="campo-ubicacion-no-disponible">
        <CardHeader titulo="Última vez vista" />
        <CardBody>
          <p role="alert" className="flex items-start gap-2 text-base font-semibold text-warn">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            No se pudo consultar el último avistamiento. Reintente.
          </p>
        </CardBody>
      </Card>
    )
  }
  if (u === 'sin_avistamientos') {
    const lecturas = resultado.candidata?.avistamientos ?? 0
    // /placas/buscar cuenta lecturas pero /ubicacion-actual dio 404: el backend se
    // contradice. Lo honesto es señalar la inconsistencia, no afirmar "sin avistamientos"
    // ni inventar una última posición a partir de `ultimoAvistamientoEn`.
    if (lecturas > 0) {
      return (
        <Card className="border-l-4 border-warn" data-testid="campo-ubicacion-inconsistente">
          <CardHeader titulo="Última vez vista" />
          <CardBody>
            <p role="alert" className="flex items-start gap-2 text-base font-semibold text-warn">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              Datos inconsistentes: hay {lecturas} {lecturas === 1 ? 'lectura registrada' : 'lecturas registradas'} pero no se
              obtuvo el último avistamiento. Consulte a la central.
            </p>
          </CardBody>
        </Card>
      )
    }
    return (
      <Card data-testid="campo-ubicacion-sin">
        <CardHeader titulo="Última vez vista" />
        <CardBody>
          <p className="text-base text-fgMuted">Sin avistamientos en el periodo retenido.</p>
        </CardBody>
      </Card>
    )
  }
  const estilo = ESTILO_FRESCURA[frescuraSegura(u.frescura, u.antiguedadSegundos)]
  return (
    <Card className={cn('border-l-4', estilo.borde)}>
      <CardHeader
        titulo="Última vez vista"
        acciones={
          <Chip tono={estilo.tono} punto title={estilo.descripcion}>
            {estilo.etiqueta}
          </Chip>
        }
      />
      <CardBody>
        <p className={cn('font-mono text-3xl font-bold leading-none', estilo.texto)}>
          <TiempoRelativo valor={u.avistamiento.capturadaEn} />
        </p>
        <p className="mt-3 flex items-start gap-2 text-base text-fg">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="font-medium">{u.avistamiento.camara.nombre}</span>
        </p>
        <p className="mt-1 font-mono text-sm text-fgMuted">{formatoAbsoluto(u.avistamiento.capturadaEn)}</p>
        {/* CU-04 · CA-06: un avistamiento pasado no es la ubicación actual. */}
        <p className="mt-3 rounded-md border border-border bg-app px-3 py-2 text-sm font-semibold text-warn">
          No equivale a su ubicación actual.
        </p>
        {u.advertencia ? <p className="mt-2 text-xs text-fgMuted">{u.advertencia}</p> : null}
      </CardBody>
    </Card>
  )
}

export function ResultadoCampo({ resultado, onNuevaConsulta, similares, onBuscarSimilares, onElegirPlaca }: Props) {
  const sinRegistros = resultado.candidata === null

  return (
    <div className="space-y-4">
      <BloqueVigilancia resultado={resultado} />
      <BloqueUltimaVezVista resultado={resultado} />

      {sinRegistros ? (
        <Card>
          <CardBody>
            <p className="text-sm text-fgMuted">
              No hay registros de {formatearPlaca(resultado.placa)}. El OCR confunde O/0, I/1, S/5, B/8 y Z/2.
            </p>
            {similares.data === undefined ? (
              <Button
                variante="secundario"
                className="mt-3 h-14 min-h-[56px] w-full text-base"
                onClick={onBuscarSimilares}
                cargando={similares.cargando}
              >
                {!similares.cargando ? <ScanSearch className="h-5 w-5" aria-hidden /> : null}
                Buscar placas similares
              </Button>
            ) : similares.data.length === 0 ? (
              <p className="mt-3 text-sm text-fgDim">No hay placas similares registradas.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-md border border-border" aria-label="Placas similares">
                {similares.data.map((c) => (
                  <li key={c.placaNormalizada}>
                    <button
                      type="button"
                      onClick={() => onElegirPlaca(c.placaNormalizada)}
                      className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-panelHover focus:outline-none focus-visible:bg-panelHover"
                    >
                      <span className="font-mono text-xl font-bold tracking-wider text-fg">{formatearPlaca(c.placaNormalizada)}</span>
                      {c.enWatchlist ? (
                        <span className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Vigilada</span>
                      ) : null}
                      <span className="ml-auto text-xs text-fgMuted">
                        {c.avistamientos} {c.avistamientos === 1 ? 'lectura' : 'lecturas'}
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-fgDim" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {similares.error ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {similares.error}
              </p>
            ) : null}
            {similares.data && similares.data.length > 0 ? (
              <p className="mt-2 text-xs text-fgDim">Al elegir una placa se rellena el formulario; pulse Consultar para verificarla.</p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Button variante="secundario" className="h-14 min-h-[56px] w-full text-base" onClick={onNuevaConsulta}>
        <RotateCcw className="h-5 w-5" aria-hidden />
        Nueva consulta
      </Button>
    </div>
  )
}
