/**
 * Edición de la política de retención (PUT /configuracion/retencion, rol
 * admin; CU-11). Campos EXACTOS de `PoliticaRetencionInput` con los mínimos y
 * máximos del contrato. El cambio queda auditado como `cambio_retencion`, por
 * eso se exige una confirmación explícita.
 * Se monta solo mientras está abierto: el estado inicial se toma al montar.
 */
import { useCallback, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Scale } from 'lucide-react'
import * as configuracionApi from '@/api/configuracion'
import { mensajeDeError } from '@/api/client'
import type { PoliticaRetencion, PoliticaRetencionInput } from '@/api/types'
import { Button, Input, Modal } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { CAMPOS_RETENCION, ETIQUETA_CAMPO_RETENCION, LIMITES_RETENCION, validarDiasRetencion } from '@/lib/retencion'

interface Props {
  politica: PoliticaRetencion
  onCerrar: () => void
  onGuardada?: (politica: PoliticaRetencion) => void
}

type Campo = keyof PoliticaRetencionInput
type Campos = Record<Campo, string>
type Errores = Partial<Record<Campo, string>>

const AYUDA_CAMPO: Record<Campo, string> = {
  diasDeteccionesSinAlerta: 'Lecturas que no coincidieron con el watchlist. Plazo corto: minimización.',
  diasDeteccionesConAlerta: 'Lecturas vinculadas a una alerta o expediente. Plazo extendido (CU-11).',
  diasImagenes: 'Recortes de evidencia. Se purgan aunque la detección se conserve.',
  diasAuditoria: 'Registro de quién consultó qué. Mínimo 1 año.',
}

function desdePolitica(p: PoliticaRetencion): Campos {
  return {
    diasDeteccionesSinAlerta: String(p.diasDeteccionesSinAlerta),
    diasDeteccionesConAlerta: String(p.diasDeteccionesConAlerta),
    diasImagenes: String(p.diasImagenes),
    diasAuditoria: p.diasAuditoria !== undefined ? String(p.diasAuditoria) : '',
  }
}

function validar(c: Campos): Errores {
  const e: Errores = {}
  for (const campo of CAMPOS_RETENCION) {
    // `diasAuditoria` es opcional en el contrato: vacío se omite del body.
    if (campo === 'diasAuditoria' && c.diasAuditoria.trim() === '') continue
    const err = validarDiasRetencion(campo, c[campo])
    if (err) e[campo] = err
  }
  return e
}

function aInput(c: Campos): PoliticaRetencionInput {
  const body: PoliticaRetencionInput = {
    diasDeteccionesSinAlerta: Number(c.diasDeteccionesSinAlerta),
    diasDeteccionesConAlerta: Number(c.diasDeteccionesConAlerta),
    diasImagenes: Number(c.diasImagenes),
  }
  if (c.diasAuditoria.trim() !== '') body.diasAuditoria = Number(c.diasAuditoria)
  return body
}

export function ModalRetencion({ politica, onCerrar, onGuardada }: Props) {
  const queryClient = useQueryClient()
  const [campos, setCampos] = useState<Campos>(() => desdePolitica(politica))
  const [errores, setErrores] = useState<Errores>({})
  const [confirmado, setConfirmado] = useState(false)

  const guardar = useMutation({
    mutationFn: (body: PoliticaRetencionInput) => configuracionApi.actualizarPoliticaRetencion(body),
    onSuccess: (actualizada) => {
      queryClient.setQueryData(qk.configuracion.retencion, actualizada)
      void queryClient.invalidateQueries({ queryKey: qk.configuracion.retencion })
      // El PUT genera un registro `cambio_retencion`: la tabla de auditoría debe reflejarlo.
      void queryClient.invalidateQueries({ queryKey: qk.auditoria.todas })
      onGuardada?.(actualizada)
      onCerrar()
    },
  })
  const enviando = guardar.isPending
  const cerrarSiLibre = useCallback(() => {
    if (!enviando) onCerrar()
  }, [enviando, onCerrar])

  function set(k: Campo, v: string) {
    setCampos((prev) => ({ ...prev, [k]: v }))
    if (errores[k]) setErrores((prev) => ({ ...prev, [k]: undefined }))
  }

  function alEnviar(e: FormEvent) {
    e.preventDefault()
    const errs = validar(campos)
    setErrores(errs)
    if (Object.values(errs).some(Boolean) || !confirmado) return
    guardar.mutate(aInput(campos))
  }

  const sinCambios = CAMPOS_RETENCION.every((c) => campos[c] === desdePolitica(politica)[c])

  return (
    <Modal
      abierto
      onCerrar={cerrarSiLibre}
      titulo="Editar política de retención"
      descripcion="Los plazos aplican en la próxima ejecución de la purga diaria."
      tamano="md"
      pie={
        <>
          <Button variante="secundario" className="min-h-[44px]" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-retencion"
            className="min-h-[44px]"
            cargando={enviando}
            disabled={!confirmado || sinCambios}
          >
            Guardar política
          </Button>
        </>
      }
    >
      <form id="form-retencion" onSubmit={alEnviar} noValidate className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-border bg-app px-3 py-2.5 text-xs leading-relaxed text-fgMuted">
          <Scale className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p>
            <span className="font-semibold text-fg">Ley N.º 29733 · Protección de Datos Personales.</span> Sin un límite, el
            sistema se convierte en un registro permanente de los movimientos de todos los vehículos. Conserve lo
            mínimo necesario durante el plazo mínimo necesario.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {CAMPOS_RETENCION.map((campo, i) => (
            <Input
              key={campo}
              label={ETIQUETA_CAMPO_RETENCION[campo]}
              type="number"
              inputMode="numeric"
              step={1}
              min={LIMITES_RETENCION[campo].min}
              max={LIMITES_RETENCION[campo].max}
              value={campos[campo]}
              onChange={(e) => set(campo, e.target.value)}
              error={errores[campo]}
              ayuda={`${AYUDA_CAMPO[campo]} Entre ${LIMITES_RETENCION[campo].min} y ${LIMITES_RETENCION[campo].max}.`}
              className="font-mono"
              required={campo !== 'diasAuditoria'}
              data-foco-inicial={i === 0 ? true : undefined}
            />
          ))}
        </div>

        {/* CU-11: el cambio de política queda en auditoría como `cambio_retencion`. */}
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md border border-warn/40 bg-warn/5 px-3 py-2.5 text-sm text-fg">
          <input
            type="checkbox"
            checked={confirmado}
            onChange={(e) => setConfirmado(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
          />
          <span>Entiendo que este cambio queda registrado en auditoría con mi usuario.</span>
        </label>

        {guardar.isError ? (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{mensajeDeError(guardar.error, 'No se pudo guardar la política.')}</span>
          </div>
        ) : null}
      </form>
    </Modal>
  )
}
