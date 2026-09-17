/**
 * CU-07 · alta y edición de cámara (rol admin). `POST /camaras` en alta,
 * `PUT /camaras/{id}` en edición. Campos EXACTOS de `CamaraInput`.
 */
import { useCallback, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import * as camarasApi from '@/api/camaras'
import { extraerApiError, mensajeDeError } from '@/api/client'
import type { Camara, CamaraCreada, CamaraInput, EstadoCamara, TipoLente } from '@/api/types'
import { Button, Input, Modal, Select } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { ESTADOS_CAMARA, ETIQUETA_ESTADO, ETIQUETA_LENTE } from './estadoCamara'

/** Se monta solo mientras está abierto: el estado inicial se toma al montar. */
interface Props {
  /** Si viene, es edición; si no, alta. */
  camara?: Camara | null
  onCerrar: () => void
  /** Alta: recibe la respuesta con la `apiKey` (CA-14). */
  onCreada?: (creada: CamaraCreada) => void
  onActualizada?: (camara: Camara) => void
}

interface Campos {
  nombre: string
  latitud: string
  longitud: string
  estado: EstadoCamara
  tipoLente: '' | TipoLente
  distanciaFocalMm: string
  resolucion: string
  fps: string
}

type Errores = Partial<Record<keyof Campos, string>>

const VACIO: Campos = {
  nombre: '',
  latitud: '',
  longitud: '',
  estado: 'activa',
  tipoLente: '',
  distanciaFocalMm: '',
  resolucion: '',
  fps: '',
}

function desdeCamara(c: Camara): Campos {
  return {
    nombre: c.nombre,
    latitud: String(c.latitud),
    longitud: String(c.longitud),
    estado: c.estado,
    tipoLente: c.tipoLente ?? '',
    distanciaFocalMm: c.distanciaFocalMm !== undefined ? String(c.distanciaFocalMm) : '',
    resolucion: c.resolucion ?? '',
    fps: c.fps !== undefined ? String(c.fps) : '',
  }
}

function validar(c: Campos): Errores {
  const e: Errores = {}
  if (c.nombre.trim().length < 3) e.nombre = 'Mínimo 3 caracteres.'
  const lat = Number(c.latitud)
  if (c.latitud.trim() === '' || Number.isNaN(lat) || lat < -90 || lat > 90) e.latitud = 'Entre -90 y 90.'
  const lng = Number(c.longitud)
  if (c.longitud.trim() === '' || Number.isNaN(lng) || lng < -180 || lng > 180) e.longitud = 'Entre -180 y 180.'
  if (c.distanciaFocalMm.trim() !== '') {
    const df = Number(c.distanciaFocalMm)
    if (Number.isNaN(df) || df <= 0) e.distanciaFocalMm = 'Debe ser un número positivo.'
  }
  if (c.fps.trim() !== '') {
    const fps = Number(c.fps)
    if (!Number.isInteger(fps) || fps <= 0 || fps > 240) e.fps = 'Entero entre 1 y 240.'
  }
  if (c.resolucion.trim() !== '' && !/^\d{2,5}x\d{2,5}$/i.test(c.resolucion.trim())) {
    e.resolucion = 'Formato ANCHOxALTO, p. ej. 1920x1080.'
  }
  return e
}

function aInput(c: Campos): CamaraInput {
  const body: CamaraInput = {
    nombre: c.nombre.trim(),
    latitud: Number(c.latitud),
    longitud: Number(c.longitud),
    estado: c.estado,
  }
  if (c.tipoLente) body.tipoLente = c.tipoLente
  if (c.distanciaFocalMm.trim() !== '') body.distanciaFocalMm = Number(c.distanciaFocalMm)
  if (c.resolucion.trim() !== '') body.resolucion = c.resolucion.trim().toLowerCase()
  if (c.fps.trim() !== '') body.fps = Number(c.fps)
  return body
}

export function FormularioCamaraModal({ camara, onCerrar, onCreada, onActualizada }: Props) {
  const queryClient = useQueryClient()
  const esEdicion = Boolean(camara)
  const [campos, setCampos] = useState<Campos>(() => (camara ? desdeCamara(camara) : VACIO))
  const [errores, setErrores] = useState<Errores>({})

  const guardar = useMutation({
    mutationFn: async (body: CamaraInput) =>
      camara
        ? { tipo: 'edicion' as const, camara: await camarasApi.actualizarCamara(camara.id, body) }
        : { tipo: 'alta' as const, camara: await camarasApi.crearCamara(body) },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: qk.camaras.todas })
      if (res.tipo === 'alta') onCreada?.(res.camara)
      else onActualizada?.(res.camara)
    },
  })
  const enviando = guardar.isPending
  // Mientras se guarda no se puede cerrar (ni Escape ni clic fuera).
  const cerrarSiLibre = useCallback(() => {
    if (!enviando) onCerrar()
  }, [enviando, onCerrar])

  function set<K extends keyof Campos>(k: K, v: Campos[K]) {
    setCampos((prev) => ({ ...prev, [k]: v }))
    if (errores[k]) setErrores((prev) => ({ ...prev, [k]: undefined }))
  }

  function alEnviar(e: FormEvent) {
    e.preventDefault()
    const errs = validar(campos)
    setErrores(errs)
    if (Object.values(errs).some(Boolean)) return
    guardar.mutate(aInput(campos))
  }

  // 400 del contrato puede traer `detalles` por campo; se muestra el mensaje general.
  const errorApi = guardar.isError
    ? (extraerApiError(guardar.error)?.mensaje ?? mensajeDeError(guardar.error, 'No se pudo guardar la cámara.'))
    : null

  return (
    <Modal
      abierto
      onCerrar={cerrarSiLibre}
      titulo={esEdicion ? 'Editar cámara' : 'Agregar cámara'}
      descripcion={
        esEdicion
          ? `Modifica los datos de "${camara?.nombre}".`
          : 'Al registrarla se generará la clave del dispositivo edge.'
      }
      tamano="lg"
      pie={
        <>
          <Button variante="secundario" className="min-h-[44px]" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-camara" className="min-h-[44px]" cargando={enviando}>
            {esEdicion ? 'Guardar cambios' : 'Registrar cámara'}
          </Button>
        </>
      }
    >
      <form id="form-camara" onSubmit={alEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Nombre / ubicación"
            placeholder="Av. Grau con Jr. Lima"
            value={campos.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            error={errores.nombre}
            maxLength={120}
            data-foco-inicial
          />
        </div>
        <Input
          label="Latitud"
          type="number"
          inputMode="decimal"
          step="any"
          min={-90}
          max={90}
          placeholder="-12.0464"
          value={campos.latitud}
          onChange={(e) => set('latitud', e.target.value)}
          error={errores.latitud}
          className="font-mono"
        />
        <Input
          label="Longitud"
          type="number"
          inputMode="decimal"
          step="any"
          min={-180}
          max={180}
          placeholder="-77.0428"
          value={campos.longitud}
          onChange={(e) => set('longitud', e.target.value)}
          error={errores.longitud}
          className="font-mono"
        />
        <Select label="Estado" value={campos.estado} onChange={(e) => set('estado', e.target.value as EstadoCamara)}>
          {ESTADOS_CAMARA.map((est) => (
            <option key={est} value={est}>
              {ETIQUETA_ESTADO[est]}
            </option>
          ))}
        </Select>
        <Select
          label="Tipo de lente"
          value={campos.tipoLente}
          onChange={(e) => set('tipoLente', e.target.value as Campos['tipoLente'])}
        >
          <option value="">Sin especificar</option>
          {(Object.keys(ETIQUETA_LENTE) as TipoLente[]).map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_LENTE[t]}
            </option>
          ))}
        </Select>
        <Input
          label="Distancia focal (mm)"
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          placeholder="6"
          value={campos.distanciaFocalMm}
          onChange={(e) => set('distanciaFocalMm', e.target.value)}
          error={errores.distanciaFocalMm}
        />
        <Input
          label="Resolución"
          placeholder="1920x1080"
          value={campos.resolucion}
          onChange={(e) => set('resolucion', e.target.value)}
          error={errores.resolucion}
        />
        <Input
          label="FPS"
          type="number"
          inputMode="numeric"
          step={1}
          min={1}
          max={240}
          placeholder="25"
          value={campos.fps}
          onChange={(e) => set('fps', e.target.value)}
          error={errores.fps}
        />

        {errorApi ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger sm:col-span-2"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{errorApi}</span>
          </div>
        ) : null}
      </form>
    </Modal>
  )
}
