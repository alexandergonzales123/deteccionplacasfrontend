/**
 * CU-02 · flujo 4a: ante pérdida de conexión con el backend se muestra un
 * aviso con la hora del último dato recibido, en vez de datos congelados en
 * silencio. Los datos previos siguen visibles debajo, pero marcados.
 */
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatoAbsoluto, formatoRelativo } from '@/lib/fechas'

interface Props {
  /** `dataUpdatedAt` de react-query (0 si nunca hubo dato). */
  ultimoDatoEn: number
  ahora: Date
  mensaje?: string
  reintentando?: boolean
  onReintentar: () => void
}

export function BannerDesconexion({ ultimoDatoEn, ahora, mensaje, reintentando, onReintentar }: Props) {
  const hayDato = ultimoDatoEn > 0
  return (
    <div
      role="alert"
      className="mb-4 flex items-center justify-between gap-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <WifiOff className="h-5 w-5 shrink-0 text-danger" aria-hidden />
        <div className="text-sm">
          <p className="font-semibold text-danger">
            {mensaje ?? 'Sin conexión con el servidor'}
            <span className="font-normal text-fgMuted">
              {' · '}
              {hayDato ? (
                <>
                  último dato recibido{' '}
                  <time dateTime={new Date(ultimoDatoEn).toISOString()} title={formatoAbsoluto(ultimoDatoEn)}>
                    {formatoRelativo(ultimoDatoEn, ahora)}
                  </time>
                </>
              ) : (
                'aún no se recibió ningún dato'
              )}
            </span>
          </p>
          <p className="text-xs text-fgMuted">Se reintenta automáticamente. Los datos mostrados pueden estar desactualizados.</p>
        </div>
      </div>
      <Button variante="secundario" tamano="sm" onClick={onReintentar} cargando={reintentando}>
        Reintentar
      </Button>
    </div>
  )
}
