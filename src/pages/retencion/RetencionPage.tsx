/**
 * Política de retención en modo solo lectura (GET /configuracion/retencion,
 * rol visor). Sección 8 del análisis: la política es consultable por
 * cualquier usuario del sistema y está pensada para ser publicada.
 */
import { useQuery } from '@tanstack/react-query'
import { Eye, Scale, ScanLine, Timer } from 'lucide-react'
import * as configuracionApi from '@/api/configuracion'
import { mensajeDeError } from '@/api/client'
import { Card, CardBody, CardHeader } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { PageHeader } from '@/layout/PageHeader'
import { CardRetencion } from '@/pages/auditoria/CardRetencion'

const PRINCIPIOS = [
  {
    icono: Scale,
    titulo: 'Finalidad determinada',
    texto:
      'El sistema existe para la seguridad ciudadana y la recuperación de vehículos. Cada consulta exige un motivo declarado; una consulta sin finalidad legítima queda registrada como tal.',
  },
  {
    icono: ScanLine,
    titulo: 'Minimización',
    texto: 'No se capturan rostros ni se identifican personas. Se conserva lo mínimo necesario durante el plazo mínimo necesario.',
  },
  {
    icono: Timer,
    titulo: 'Plazo de conservación',
    texto:
      'Las detecciones que no coincidieron con ninguna placa vigilada se eliminan al vencer el plazo de la política. Conservarlas indefinidamente convertiría el sistema en un registro permanente de los movimientos de toda la población vehicular.',
  },
  {
    icono: Eye,
    titulo: 'Trazabilidad',
    texto:
      'Toda consulta queda en un registro de auditoría inmutable, con usuario, placa, motivo, IP y fecha. Es el control que permite detectar y acreditar un uso indebido.',
  },
] as const

export function RetencionPage() {
  const retencion = useQuery({
    queryKey: qk.configuracion.retencion,
    queryFn: configuracionApi.obtenerPoliticaRetencion,
    staleTime: 60_000,
  })

  return (
    <>
      <PageHeader titulo="Política de retención" subtitulo="Cuánto tiempo conserva el sistema cada tipo de dato" />

      <CardRetencion
        className="mb-6"
        politica={retencion.data}
        cargando={retencion.isPending}
        error={retencion.isError ? mensajeDeError(retencion.error, 'No se pudo cargar la política de retención.') : null}
      />

      <Card>
        <CardHeader
          titulo="Transparencia"
          subtitulo="Ley N.º 29733 de Protección de Datos Personales y su reglamento"
        />
        <CardBody>
          <p className="text-sm leading-relaxed text-fgMuted">
            Una placa es un dato asociado a una persona identificable y el conjunto de sus avistamientos revela sus
            desplazamientos. Por eso el sistema se diseña con estos límites, que cualquier usuario puede consultar
            aquí y que la municipalidad puede publicar.
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {PRINCIPIOS.map(({ icono: Icono, titulo, texto }) => (
              <li key={titulo} className="flex gap-3 rounded-md border border-border bg-app px-4 py-3">
                <Icono className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-fg">{titulo}</p>
                  <p className="mt-1 text-xs leading-relaxed text-fgMuted">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-fgDim">
            La señalización de las cámaras en vía pública corresponde a la municipalidad. Solo un administrador puede
            modificar los plazos, y cada cambio queda registrado en auditoría.
          </p>
        </CardBody>
      </Card>
    </>
  )
}
