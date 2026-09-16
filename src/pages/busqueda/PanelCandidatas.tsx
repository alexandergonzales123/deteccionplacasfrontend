/**
 * CU-03 · flujo 3a / CA-05: placas similares con su distancia de edición para
 * que el operador elija. Cada fila re-ejecuta la búsqueda con esa placa.
 */
import { ChevronRight, ScanSearch } from 'lucide-react'
import type { CandidataPlaca } from '@/api/types'
import { TiempoRelativo } from '@/components/TiempoRelativo'
import { Badge, Card, CardHeader, Chip } from '@/components/ui'
import { formatearPlaca } from '@/lib/placas'

interface Props {
  patron: string
  candidatas: CandidataPlaca[]
  porFaltaDeExacta: boolean
  onElegir: (placaNormalizada: string) => void
}

export function PanelCandidatas({ patron, candidatas, porFaltaDeExacta, onElegir }: Props) {
  return (
    <Card>
      <CardHeader
        titulo={
          <span className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-warn" aria-hidden />
            {porFaltaDeExacta ? 'Sin coincidencia exacta. Placas similares:' : 'Placas que coinciden con el patrón:'}
          </span>
        }
        subtitulo={
          porFaltaDeExacta
            ? `No hay avistamientos de ${formatearPlaca(patron)} en el periodo. El OCR confunde O/0, I/1, S/5, B/8 y Z/2; elija la placa correcta.`
            : `Patrón consultado: ${patron}`
        }
      />
      <ul className="divide-y divide-border">
        {candidatas.map((c) => (
          <li key={c.placaNormalizada}>
            <button
              type="button"
              onClick={() => onElegir(c.placaNormalizada)}
              className="flex min-h-[44px] w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-panelHover focus:outline-none focus-visible:bg-panelHover"
            >
              <span className="font-mono text-base font-bold tracking-wider text-fg">
                {formatearPlaca(c.placaNormalizada)}
              </span>
              <Chip tono={c.distancia === 0 ? 'ok' : c.distancia === 1 ? 'warn' : 'muted'}>
                {c.coincidenciaExacta ? 'exacta' : `distancia ${c.distancia}`}
              </Chip>
              {c.enWatchlist ? (
                <Badge tono="danger" solido>
                  En watchlist
                </Badge>
              ) : null}
              <span className="ml-auto hidden text-right text-xs text-fgMuted sm:block">
                <span className="block font-mono text-sm text-fg">
                  {c.avistamientos} {c.avistamientos === 1 ? 'avistamiento' : 'avistamientos'}
                </span>
                {c.ultimoAvistamientoEn ? (
                  <>
                    último <TiempoRelativo valor={c.ultimoAvistamientoEn} />
                  </>
                ) : (
                  'sin fecha'
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-fgDim" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
