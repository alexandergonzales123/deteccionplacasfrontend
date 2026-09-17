/**
 * "Política de retención vigente" (GET /configuracion/retencion, rol visor).
 * La usan Auditoría (con botón "Editar política" para admin) y la página
 * pública /retencion en modo solo lectura (sección 8: transparencia).
 */
import { AlertTriangle, Pencil, ShieldCheck } from 'lucide-react'
import type { PoliticaRetencion } from '@/api/types'
import { TiempoRelativo } from '@/components/TiempoRelativo'
import { Badge, Button, Card, CardBody, CardHeader, Skeleton } from '@/components/ui'
import { useReloj } from '@/hooks/useReloj'
import { cn } from '@/lib/cn'
import { formatoAbsoluto, formatoAbsolutoCorto } from '@/lib/fechas'
import { aniosDesdeDias, ESTILO_PURGA, estadoPurga } from '@/lib/retencion'

interface Props {
  politica: PoliticaRetencion | undefined
  cargando: boolean
  /** Mensaje de error ya legible (mensajeDeError). */
  error?: string | null
  /** Si viene, se muestra el botón "Editar política" (solo admin). */
  onEditar?: () => void
  className?: string
}

// El estado de purga cambia por horas; basta con un reloj por minuto.
const INTERVALO_RELOJ_MS = 60_000

function Cifra({ valor, unidad, etiqueta }: { valor: string; unidad: string; etiqueta: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-bold leading-none text-fg">{valor}</span>
        <span className="text-xs text-fgMuted">{unidad}</span>
      </p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-fgMuted">{etiqueta}</p>
    </div>
  )
}

export function CardRetencion({ politica, cargando, error, onEditar, className }: Props) {
  const ahora = useReloj(INTERVALO_RELOJ_MS)
  const purga = estadoPurga(politica?.ultimaPurgaEn, ahora)
  const estiloPurga = ESTILO_PURGA[purga]

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        titulo={
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            Política de retención vigente
          </span>
        }
        subtitulo="Plazos de conservación (Ley N.º 29733)"
        acciones={
          <div className="flex items-center gap-2">
            {politica ? <Badge tono={estiloPurga.tono}>{estiloPurga.etiqueta}</Badge> : null}
            {onEditar ? (
              <Button variante="secundario" tamano="sm" className="min-h-[44px]" onClick={onEditar}>
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Editar política
              </Button>
            ) : null}
          </div>
        }
      />
      <CardBody className="flex flex-1 flex-col">
        {cargando ? (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : error || !politica ? (
          <div role="alert" className="flex items-start gap-2 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error ?? 'No se pudo cargar la política de retención.'}</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              <Cifra valor={String(politica.diasDeteccionesSinAlerta)} unidad="días" etiqueta="Detecciones sin alerta" />
              <Cifra valor={String(politica.diasDeteccionesConAlerta)} unidad="días" etiqueta="Detecciones con alerta" />
              <Cifra valor={String(politica.diasImagenes)} unidad="días" etiqueta="Imágenes de evidencia" />
              {politica.diasAuditoria !== undefined ? (
                <Cifra valor={aniosDesdeDias(politica.diasAuditoria)} unidad="años" etiqueta="Registro de auditoría" />
              ) : (
                <Cifra valor="—" unidad="" etiqueta="Registro de auditoría" />
              )}
            </div>

            {/* CU-11 · CA-10: la ejecución de la purga queda registrada con la cantidad eliminada. */}
            <p className="my-5 font-mono text-xs text-fgMuted">
              Última purga:{' '}
              {politica.ultimaPurgaEn ? (
                <>
                  <TiempoRelativo valor={politica.ultimaPurgaEn} className="text-fg" />
                  <span className="text-fgDim"> ({formatoAbsoluto(politica.ultimaPurgaEn)})</span>
                </>
              ) : (
                <span className="text-fg">sin registro</span>
              )}
              {politica.registrosPurgadosUltimaEjecucion !== undefined ? (
                <>
                  {' '}
                  · <span className="text-fg">{politica.registrosPurgadosUltimaEjecucion.toLocaleString('es-PE')}</span>{' '}
                  {politica.registrosPurgadosUltimaEjecucion === 1 ? 'detección eliminada' : 'detecciones eliminadas'}
                </>
              ) : null}
            </p>

            {politica.actualizadaEn || politica.actualizadaPor ? (
              <p className="mt-auto border-t border-border pt-3 text-xs text-fgDim">
                Actualizada
                {politica.actualizadaPor?.nombre ? (
                  <>
                    {' '}
                    por <span className="text-fgMuted">{politica.actualizadaPor.nombre}</span>
                  </>
                ) : null}
                {politica.actualizadaEn ? (
                  <>
                    {' '}
                    el{' '}
                    <time dateTime={politica.actualizadaEn} className="text-fgMuted">
                      {formatoAbsolutoCorto(politica.actualizadaEn)}
                    </time>
                  </>
                ) : null}
              </p>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  )
}
