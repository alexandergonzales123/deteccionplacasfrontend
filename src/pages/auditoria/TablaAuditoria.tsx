/**
 * CU-10 · paso 2: usuario, acción, placa, motivo declarado, IP y fecha.
 * Las filas con motivo genérico se resaltan en ámbar para que el auditor las
 * detecte de un vistazo (R-03).
 */
import { format } from 'date-fns'
import type { RegistroAuditoria } from '@/api/types'
import { Badge, Table, TBody, Td, Th, THead, Tr } from '@/components/ui'
import { etiquetaAccion, tieneMotivoGenerico } from '@/lib/auditoria'
import { cn } from '@/lib/cn'
import { aFecha, formatoAbsoluto } from '@/lib/fechas'
import { formatearPlaca } from '@/lib/placas'

interface Props {
  registros: readonly RegistroAuditoria[]
}

/** "16/09 14:03:27" (el día completo ya lo fija el filtro; el title lleva la fecha larga). */
function formatoFechaHora(valor: string): string {
  const d = aFecha(valor)
  return d ? format(d, 'dd/MM HH:mm:ss') : ''
}

export function TablaAuditoria({ registros }: Props) {
  return (
    <Table>
      <THead>
        <tr>
          <Th>Usuario</Th>
          <Th>Acción</Th>
          <Th>Placa</Th>
          <Th>Motivo declarado</Th>
          <Th>IP</Th>
          <Th>Fecha y hora</Th>
        </tr>
      </THead>
      <TBody>
        {registros.map((r) => {
          const generico = tieneMotivoGenerico(r)
          return (
            <Tr key={r.id} className={cn(generico ? 'bg-warn/5 hover:bg-warn/10' : 'hover:bg-panelHover')} data-generico={generico || undefined}>
              <Td className="whitespace-nowrap">
                {/* `usuario` es requerido en el contrato; "Sistema" cubre acciones automáticas (purga) o backend desalineado. */}
                <span className="font-medium text-fg">{r.usuario?.nombre ?? 'Sistema'}</span>
                {r.usuario?.email ? <span className="block text-xs text-fgDim">{r.usuario.email}</span> : null}
              </Td>
              <Td className="whitespace-nowrap text-fgMuted">{etiquetaAccion(r.accion)}</Td>
              <Td className="whitespace-nowrap font-mono text-sm font-bold tracking-wider text-fg">
                {r.placaConsultada ? formatearPlaca(r.placaConsultada) : <span className="font-sans font-normal text-fgDim">—</span>}
              </Td>
              <Td className="max-w-[320px]">
                <div className="flex flex-wrap items-center gap-2">
                  {r.motivo ? (
                    <span className={cn('min-w-0 break-words', generico ? 'text-warn' : 'text-fg')}>{r.motivo}</span>
                  ) : (
                    <span className="text-fgDim">{generico ? 'Sin motivo' : '—'}</span>
                  )}
                  {generico ? <Badge tono="warn">Motivo genérico</Badge> : null}
                </div>
              </Td>
              <Td className="whitespace-nowrap font-mono text-xs text-fgMuted">{r.ipOrigen ?? '—'}</Td>
              <Td className="whitespace-nowrap font-mono text-xs text-fgMuted">
                <time dateTime={r.realizadaEn} title={formatoAbsoluto(r.realizadaEn)}>
                  {formatoFechaHora(r.realizadaEn)}
                </time>
              </Td>
            </Tr>
          )
        })}
      </TBody>
    </Table>
  )
}
