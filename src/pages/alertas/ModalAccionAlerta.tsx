/**
 * CU-06 · confirmación humana antes de cambiar el estado de una alerta.
 * `PATCH /alertas/{id}` con `{ estado, comentario }`:
 *  - revisar   → `revisada`   (paso 2-3: confirmar con la evidencia a la vista; comentario obligatorio)
 *  - descartar → `descartada` (2a: falso positivo; el motivo alimenta la métrica de precisión)
 *  - reabrir   → `nueva`      (3a: solo supervisor; comentario opcional)
 * R-05: nunca hay acción automática; la evidencia se muestra en el propio modal.
 */
import { useCallback, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Eye, MapPin } from 'lucide-react'
import * as alertasApi from '@/api/alertas'
import { mensajeDeError } from '@/api/client'
import type { Alerta, CambioEstadoAlertaInput, EstadoAlerta } from '@/api/types'
import { ChipConfianza } from '@/components/ChipConfianza'
import { ChipMotivo } from '@/components/ChipMotivo'
import { EvidenciaDeteccion } from '@/components/EvidenciaDeteccion'
import { Button, Modal, Textarea } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { formatoAbsoluto } from '@/lib/fechas'
import { formatearPlaca } from '@/lib/placas'

export type AccionAlerta = 'revisar' | 'descartar' | 'reabrir'

const COMENTARIO_MAX = 500

interface ConfigAccion {
  titulo: string
  estado: EstadoAlerta
  labelComentario: string
  placeholder: string
  comentarioObligatorio: boolean
  textoBoton: string
  varianteBoton: 'primario' | 'exito' | 'peligro'
  conEvidencia: boolean
}

const CONFIG: Record<AccionAlerta, ConfigAccion> = {
  revisar: {
    titulo: 'Marcar alerta como revisada',
    estado: 'revisada',
    labelComentario: 'Comentario de la acción tomada',
    placeholder: 'Se comunicó a la unidad móvil 12 / se verificó en campo…',
    comentarioObligatorio: true,
    textoBoton: 'Marcar revisada',
    varianteBoton: 'exito',
    conEvidencia: true,
  },
  descartar: {
    titulo: 'Descartar alerta',
    estado: 'descartada',
    labelComentario: 'Motivo del descarte (falso positivo del OCR, placa no coincide, etc.)',
    placeholder: 'La imagen muestra AKQ-198 pero el OCR leyó AKO-198…',
    comentarioObligatorio: true,
    textoBoton: 'Descartar',
    varianteBoton: 'peligro',
    conEvidencia: true,
  },
  reabrir: {
    titulo: 'Reabrir alerta',
    estado: 'nueva',
    labelComentario: 'Comentario (opcional)',
    placeholder: 'Cerrada por error; requiere nueva revisión…',
    comentarioObligatorio: false,
    textoBoton: 'Reabrir',
    varianteBoton: 'primario',
    conEvidencia: false,
  },
}

interface Props {
  alerta: Alerta
  accion: AccionAlerta
  onCerrar: () => void
}

/** Se monta solo mientras está abierto: el estado del formulario nace al montar. */
export function ModalAccionAlerta({ alerta, accion, onCerrar }: Props) {
  const cfg = CONFIG[accion]
  const queryClient = useQueryClient()
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState<string | undefined>()

  const cambiar = useMutation({
    mutationFn: (body: CambioEstadoAlertaInput) => alertasApi.cambiarEstadoAlerta(alerta.id, body),
    onSuccess: (actualizada) => {
      // Detalle al instante; el listado y el badge de la nav (['alertas','nuevas']) se refrescan por invalidación.
      queryClient.setQueryData(qk.alertas.detalle(actualizada.id), actualizada)
      void queryClient.invalidateQueries({ queryKey: qk.alertas.todas })
      onCerrar()
    },
  })
  const enviando = cambiar.isPending
  // Mientras se envía no se puede cerrar (ni Escape ni clic fuera).
  const cerrarSiLibre = useCallback(() => {
    if (!enviando) onCerrar()
  }, [enviando, onCerrar])

  function alEnviar(e: FormEvent) {
    e.preventDefault()
    const texto = comentario.trim()
    if (cfg.comentarioObligatorio && texto.length === 0) {
      setError('Indique un comentario.')
      return
    }
    if (texto.length > COMENTARIO_MAX) {
      setError(`Máximo ${COMENTARIO_MAX} caracteres.`)
      return
    }
    const body: CambioEstadoAlertaInput = { estado: cfg.estado }
    if (texto) body.comentario = texto
    cambiar.mutate(body)
  }

  const d = alerta.deteccion
  const idForm = `form-accion-alerta-${alerta.id}`
  const desactivarEnvio = cfg.comentarioObligatorio && comentario.trim().length === 0

  return (
    <Modal
      abierto
      onCerrar={cerrarSiLibre}
      titulo={cfg.titulo}
      descripcion={`${formatearPlaca(alerta.placaNormalizada)} · ${d.camara.nombre}`}
      tamano={cfg.conEvidencia ? 'md' : 'sm'}
      pie={
        <>
          <Button variante="secundario" className="min-h-[44px]" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={idForm}
            variante={cfg.varianteBoton}
            className="min-h-[44px]"
            cargando={enviando}
            disabled={desactivarEnvio}
          >
            {cfg.textoBoton}
          </Button>
        </>
      }
    >
      <form id={idForm} onSubmit={alEnviar} noValidate className="space-y-4">
        {/* Resumen: placa, motivo, cámara, hora y confianza (CU-06 · paso 1). */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xl font-bold tracking-wider text-fg">{formatearPlaca(alerta.placaNormalizada)}</span>
          <ChipMotivo motivo={alerta.motivoWatchlist} />
          <ChipConfianza confianza={d.confianza} />
        </div>
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-fgMuted">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-fgDim" aria-hidden />
          <span className="text-fg">{d.camara.nombre}</span>
          <span aria-hidden>·</span>
          <span className="font-mono text-xs">{formatoAbsoluto(d.capturadaEn)}</span>
          <span aria-hidden>·</span>
          <span className="text-xs">
            OCR: <span className="font-mono">{d.placa}</span>
          </span>
        </p>

        {cfg.conEvidencia ? <EvidenciaDeteccion deteccion={d} className="max-h-[40vh]" /> : null}

        {accion === 'revisar' ? (
          // R-05: confirmación humana con la evidencia a la vista antes de actuar.
          <div className="flex items-start gap-2 rounded-md border border-warn/40 bg-warn/10 px-3 py-2.5 text-sm text-warn">
            <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Confirme visualmente que la lectura corresponde a la placa vigilada antes de marcarla como revisada (R-05).</span>
          </div>
        ) : accion === 'descartar' ? (
          // CU-06 · 2a: los descartes alimentan la métrica de precisión del sistema.
          <p className="text-xs text-fgMuted">
            El descarte queda auditado y alimenta la métrica de precisión del sistema. Indique por qué la alerta no procede.
          </p>
        ) : (
          // CU-06 · 3a / CA-13: se conserva el historial de ambos cambios.
          <p className="text-xs text-fgMuted">
            La alerta volverá al estado <span className="font-semibold text-fg">nueva</span>. El cierre anterior se conserva en auditoría.
          </p>
        )}

        <Textarea
          label={cfg.labelComentario}
          placeholder={cfg.placeholder}
          rows={3}
          maxLength={COMENTARIO_MAX}
          contador
          required={cfg.comentarioObligatorio}
          value={comentario}
          onChange={(e) => {
            setComentario(e.target.value)
            if (error) setError(undefined)
          }}
          error={error}
          data-foco-inicial
        />

        {cambiar.isError ? (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{mensajeDeError(cambiar.error, 'No se pudo actualizar la alerta.')}</span>
          </div>
        ) : null}
      </form>
    </Modal>
  )
}
