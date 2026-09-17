/**
 * "Consultas de hoy" (o del día seleccionado): totales sobre los registros
 * CARGADOS del listado. TODO(contrato): no hay endpoint de conteo agregado;
 * si la página está truncada (`siguienteCursor`), el total es un piso ("N+").
 */
import { FileText, MessageSquareWarning } from 'lucide-react'
import type { RegistroAuditoria } from '@/api/types'
import { Card, CardBody, CardHeader, Skeleton } from '@/components/ui'
import { requiereMotivo, tieneMotivoGenerico } from '@/lib/auditoria'
import { cn } from '@/lib/cn'

interface Props {
  registros: readonly RegistroAuditoria[]
  cargando: boolean
  truncado: boolean
  /** "hoy" o la fecha legible del día seleccionado. */
  etiquetaDia: string
  className?: string
}

export function CardConsultasDia({ registros, cargando, truncado, etiquetaDia, className }: Props) {
  const total = registros.length
  // Solo las consultas de placa llevan motivo; el resto son acciones administrativas.
  const consultas = registros.filter(requiereMotivo).length
  const genericos = registros.filter(tieneMotivoGenerico).length
  const conExpediente = consultas - genericos
  const administrativas = total - consultas
  const sufijo = truncado ? '+' : ''

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader titulo={`Consultas de ${etiquetaDia}`} subtitulo="Según los filtros aplicados" />
      <CardBody className="flex flex-1 flex-col">
        {cargando ? (
          <Skeleton className="h-14 w-24" />
        ) : (
          <>
            <p className="flex items-baseline gap-1.5">
              <span className="font-mono text-4xl font-bold leading-none text-fg">
                {total}
                {sufijo}
              </span>
              <span className="text-xs text-fgMuted">{total === 1 && !truncado ? 'registro' : 'registros'}</span>
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-md border border-border bg-app px-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fgMuted">
                  <FileText className="h-3.5 w-3.5 text-ok" aria-hidden />
                  Con expediente
                </dt>
                <dd className="mt-1 font-mono text-2xl font-bold text-ok">
                  {conExpediente}
                  {sufijo}
                </dd>
              </div>
              <div className="rounded-md border border-border bg-app px-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fgMuted">
                  <MessageSquareWarning className="h-3.5 w-3.5 text-warn" aria-hidden />
                  Motivo genérico
                </dt>
                <dd className={cn('mt-1 font-mono text-2xl font-bold', genericos > 0 ? 'text-warn' : 'text-fg')}>
                  {genericos}
                  {sufijo}
                </dd>
              </div>
            </dl>
            {administrativas > 0 ? (
              <p className="mt-3 text-xs text-fgMuted">
                {administrativas} {administrativas === 1 ? 'acción administrativa' : 'acciones administrativas'}
                {sufijo} sin motivo requerido (watchlist, alertas, retención, exportación).
              </p>
            ) : null}
            <p className="mt-auto pt-4 text-xs text-fgDim">
              {truncado
                ? 'Conteo parcial: hay más registros en el periodo. Use «Cargar más» para completarlo.'
                : 'Un motivo es genérico si no referencia denuncia, oficio, orden ni número de expediente.'}
            </p>
          </>
        )}
      </CardBody>
    </Card>
  )
}
