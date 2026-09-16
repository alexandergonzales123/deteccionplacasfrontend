/**
 * CU-05 · paso 1-2: el supervisor agrega una placa con motivo, expediente de
 * respaldo y vencimiento opcional. `POST /watchlist` con los campos EXACTOS de
 * `WatchlistItemInput`. Flujo 1a: una misma placa puede figurar más de una vez
 * con motivos distintos; el backend no lo rechaza y aquí tampoco se bloquea.
 */
import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import * as watchlistApi from '@/api/watchlist'
import { mensajeDeError } from '@/api/client'
import type { MotivoWatchlist, WatchlistItemInput } from '@/api/types'
import { Button, Card, CardBody, CardHeader, Input, Select, Textarea } from '@/components/ui'
import { qk } from '@/hooks/queryKeys'
import { aFecha } from '@/lib/fechas'
import { formatearPlaca, normalizarPlaca, PATRON_PLACA_NORMALIZADA } from '@/lib/placas'
import { ETIQUETA_MOTIVO, MOTIVOS_WATCHLIST } from '@/lib/watchlist'

const NOTAS_MAX = 500

interface Campos {
  placa: string
  motivo: MotivoWatchlist
  referenciaExpediente: string
  /** Valor de `<input type="datetime-local">` (hora local) o vacío. */
  venceEn: string
  notas: string
}

type Errores = Partial<Record<keyof Campos, string>>

const VACIO: Campos = { placa: '', motivo: 'robado', referenciaExpediente: '', venceEn: '', notas: '' }

function validar(c: Campos): Errores {
  const e: Errores = {}
  if (!PATRON_PLACA_NORMALIZADA.test(c.placa)) e.placa = 'Entre 6 y 8 letras o números.'
  if (c.referenciaExpediente.trim().length === 0) e.referenciaExpediente = 'Indique la denuncia, oficio u orden que respalda la vigilancia.'
  if (c.venceEn) {
    const d = aFecha(c.venceEn)
    if (!d) e.venceEn = 'Fecha inválida.'
    else if (d.getTime() <= Date.now()) e.venceEn = 'Debe ser una fecha futura.'
  }
  if (c.notas.length > NOTAS_MAX) e.notas = `Máximo ${NOTAS_MAX} caracteres.`
  return e
}

function aInput(c: Campos): WatchlistItemInput {
  const body: WatchlistItemInput = {
    placa: c.placa,
    motivo: c.motivo,
    referenciaExpediente: c.referenciaExpediente.trim(),
    // null explícito: sin fecha de fin la vigilancia no caduca (CU-05 · 3a).
    venceEn: c.venceEn ? (aFecha(c.venceEn)?.toISOString() ?? null) : null,
  }
  if (c.notas.trim()) body.notas = c.notas.trim()
  return body
}

export function FormularioWatchlist() {
  const queryClient = useQueryClient()
  const [campos, setCampos] = useState<Campos>(VACIO)
  const [errores, setErrores] = useState<Errores>({})
  const [ultimaAgregada, setUltimaAgregada] = useState<string | null>(null)

  const agregar = useMutation({
    mutationFn: (body: WatchlistItemInput) => watchlistApi.agregarAWatchlist(body),
    onSuccess: (creada) => {
      setUltimaAgregada(creada.placaNormalizada)
      // Se conserva el motivo: es habitual cargar varias placas del mismo oficio.
      setCampos((prev) => ({ ...VACIO, motivo: prev.motivo }))
      setErrores({})
      void queryClient.invalidateQueries({ queryKey: qk.watchlist.todas })
    },
  })
  const enviando = agregar.isPending

  function set<K extends keyof Campos>(k: K, v: Campos[K]) {
    setCampos((prev) => ({ ...prev, [k]: v }))
    if (errores[k]) setErrores((prev) => ({ ...prev, [k]: undefined }))
    if (ultimaAgregada) setUltimaAgregada(null)
  }

  function alEnviar(e: FormEvent) {
    e.preventDefault()
    const errs = validar(campos)
    setErrores(errs)
    if (Object.values(errs).some(Boolean)) return
    agregar.mutate(aInput(campos))
  }

  return (
    <Card className="mb-6">
      <CardHeader titulo="Agregar placa a la vigilancia" subtitulo="Toda detección de la placa generará una alerta hasta que se retire o venza." />
      <CardBody>
        <form onSubmit={alEnviar} noValidate className="grid gap-4 md:grid-cols-12 md:items-start">
          <div className="md:col-span-3">
            <Input
              label="Placa"
              mono
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="AKQ-198"
              maxLength={9}
              value={campos.placa}
              // Acepta guion y minúsculas; la API solo recibe la placa normalizada.
              onChange={(e) => set('placa', normalizarPlaca(e.target.value).replace(/[?*]/g, ''))}
              error={errores.placa}
              className="min-h-[44px]"
            />
          </div>
          <div className="md:col-span-3">
            <Select label="Motivo" value={campos.motivo} onChange={(e) => set('motivo', e.target.value as MotivoWatchlist)}>
              {MOTIVOS_WATCHLIST.map((m) => (
                <option key={m} value={m}>
                  {ETIQUETA_MOTIVO[m]}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-4">
            <Input
              label="Expediente de respaldo"
              required
              placeholder="Denuncia DEN-2026-4471 / Oficio 218-2026-GSC"
              maxLength={200}
              value={campos.referenciaExpediente}
              onChange={(e) => set('referenciaExpediente', e.target.value)}
              error={errores.referenciaExpediente}
              className="min-h-[44px]"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Vence en"
              type="datetime-local"
              value={campos.venceEn}
              onChange={(e) => set('venceEn', e.target.value)}
              error={errores.venceEn}
              ayuda="Opcional"
              className="min-h-[44px]"
            />
          </div>
          <div className="md:col-span-9">
            <Textarea
              label="Notas"
              rows={2}
              placeholder="Características del vehículo, contacto del denunciante, etc."
              maxLength={NOTAS_MAX}
              contador
              value={campos.notas}
              onChange={(e) => set('notas', e.target.value)}
              error={errores.notas}
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-3">
            <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-transparent md:block" aria-hidden>
              Agregar
            </span>
            <Button type="submit" tamano="lg" className="min-h-[44px] w-full" cargando={enviando}>
              {!enviando ? <Plus className="h-4 w-4" aria-hidden /> : null}
              Agregar placa
            </Button>
          </div>

          {agregar.isError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger md:col-span-12"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{mensajeDeError(agregar.error, 'No se pudo agregar la placa.')}</span>
            </div>
          ) : ultimaAgregada ? (
            <p role="status" className="flex items-center gap-2 text-sm text-ok md:col-span-12">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Placa <span className="font-mono font-bold">{formatearPlaca(ultimaAgregada)}</span> agregada a la vigilancia.
            </p>
          ) : null}
        </form>
      </CardBody>
    </Card>
  )
}
