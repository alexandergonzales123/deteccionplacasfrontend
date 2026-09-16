import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { PageHeader } from '@/layout/PageHeader'

interface Props {
  titulo: string
  subtitulo?: string
}

/** Marcador de posición para pantallas de fases posteriores. */
export function EnConstruccionPage({ titulo, subtitulo }: Props) {
  return (
    <>
      <PageHeader titulo={titulo} subtitulo={subtitulo} />
      <div className="rounded-lg border border-border bg-panel">
        <EmptyState
          icono={Construction}
          titulo="En construcción"
          descripcion="Esta pantalla se implementa en una fase posterior del MVP."
        />
      </div>
    </>
  )
}
