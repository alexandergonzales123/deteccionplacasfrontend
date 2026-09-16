import { useReloj } from '@/hooks/useReloj'
import { formatoAbsoluto, formatoRelativo } from '@/lib/fechas'

interface Props {
  valor: string | null | undefined
  className?: string
  title?: string
}

/**
 * "hace 12 s" que avanza solo. Cada instancia lleva su propio reloj para que
 * las páginas no tengan que re-renderizarse cada segundo (y los modales
 * abiertos sobre ellas no pierdan el foco).
 */
export function TiempoRelativo({ valor, className, title }: Props) {
  const ahora = useReloj(1000)
  if (!valor) return null
  return (
    <time dateTime={valor} title={title ?? formatoAbsoluto(valor)} className={className}>
      {formatoRelativo(valor, ahora)}
    </time>
  )
}
