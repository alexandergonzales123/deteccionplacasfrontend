/**
 * CU-03 · paso 1: placa + rango + motivo. El motivo es obligatorio por diseño
 * (flujo 1a): sin motivo válido el botón queda deshabilitado y la consulta
 * nunca sale del cliente.
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Button, Card, CardBody, Input } from '@/components/ui'
import { aFecha } from '@/lib/fechas'
import { normalizarPlaca, PATRON_PLACA_NORMALIZADA } from '@/lib/placas'
import { tieneComodines } from './ejecutarBusqueda'

/** Rango del parámetro `Motivo` del contrato. */
const MOTIVO_MIN = 4
const MOTIVO_MAX = 200

export interface ValoresBusqueda {
  placa: string
  /** Valor de `<input type="datetime-local">` (hora local). */
  desde: string
  hasta: string
  motivo: string
}

interface Props {
  valores: ValoresBusqueda
  onCambiar: (v: ValoresBusqueda) => void
  onBuscar: (v: ValoresBusqueda) => void
  buscando: boolean
  /** "N avistamientos encontrados" a la derecha. */
  resumen?: ReactNode
}

function validarPlaca(placa: string): string | null {
  if (!placa) return 'Ingrese una placa.'
  if (tieneComodines(placa)) {
    if (placa.replace(/[?*]/g, '').length < 2) return 'Indique al menos 2 caracteres conocidos.'
    if (placa.length > 8) return 'Máximo 8 caracteres.'
    return null
  }
  if (!PATRON_PLACA_NORMALIZADA.test(placa)) return 'La placa debe tener entre 6 y 8 letras o números.'
  return null
}

function validarRango(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return 'Indique el rango de fechas.'
  const d = aFecha(desde)
  const h = aFecha(hasta)
  if (!d || !h) return 'Fecha inválida.'
  if (d.getTime() > h.getTime()) return '"Desde" debe ser anterior a "Hasta".'
  return null
}

export function BarraBusqueda({ valores, onCambiar, onBuscar, buscando, resumen }: Props) {
  const [errores, setErrores] = useState<{ placa?: string; rango?: string }>({})

  const motivoValido = valores.motivo.trim().length >= MOTIVO_MIN && valores.motivo.trim().length <= MOTIVO_MAX
  const puedeBuscar = motivoValido && valores.placa.length > 0 && !buscando

  function alEnviar(e: FormEvent) {
    e.preventDefault()
    const errPlaca = validarPlaca(valores.placa)
    const errRango = validarRango(valores.desde, valores.hasta)
    setErrores({ placa: errPlaca ?? undefined, rango: errRango ?? undefined })
    if (errPlaca || errRango || !motivoValido) return
    onBuscar({ ...valores, motivo: valores.motivo.trim() })
  }

  return (
    <Card className="mb-6">
      <CardBody>
        <form onSubmit={alEnviar} noValidate className="grid gap-4 md:grid-cols-12 md:items-start">
          <div className="md:col-span-3">
            <Input
              label="Placa"
              mono
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="AKQ-198"
              maxLength={9}
              value={valores.placa}
              onChange={(e) => {
                // Acepta guion y minúsculas; se normaliza al vuelo (la API solo recibe placa normalizada).
                onCambiar({ ...valores, placa: normalizarPlaca(e.target.value) })
                if (errores.placa) setErrores((prev) => ({ ...prev, placa: undefined }))
              }}
              error={errores.placa}
              ayuda="Admite ? (un carácter) y * (varios)"
              className="min-h-[44px]"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Desde"
              type="datetime-local"
              value={valores.desde}
              max={valores.hasta || undefined}
              onChange={(e) => {
                onCambiar({ ...valores, desde: e.target.value })
                if (errores.rango) setErrores((prev) => ({ ...prev, rango: undefined }))
              }}
              error={errores.rango}
              className="min-h-[44px]"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Hasta"
              type="datetime-local"
              value={valores.hasta}
              min={valores.desde || undefined}
              onChange={(e) => {
                onCambiar({ ...valores, hasta: e.target.value })
                if (errores.rango) setErrores((prev) => ({ ...prev, rango: undefined }))
              }}
              className="min-h-[44px]"
            />
          </div>
          <div className="md:col-span-3">
            <Input
              label="Motivo"
              required
              placeholder="Denuncia 2026-4471 / oficio / operativo"
              maxLength={MOTIVO_MAX}
              value={valores.motivo}
              onChange={(e) => onCambiar({ ...valores, motivo: e.target.value })}
              error={
                valores.motivo.length > 0 && !motivoValido
                  ? `Entre ${MOTIVO_MIN} y ${MOTIVO_MAX} caracteres.`
                  : undefined
              }
              ayuda="El motivo queda registrado en auditoría"
              className="min-h-[44px]"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-transparent md:block" aria-hidden>
              Buscar
            </span>
            <Button type="submit" tamano="lg" className="min-h-[44px] w-full" disabled={!puedeBuscar} cargando={buscando}>
              {!buscando ? <Search className="h-4 w-4" aria-hidden /> : null}
              Buscar
            </Button>
          </div>
        </form>
        {resumen ? <div className="mt-3 flex justify-end text-sm text-fgMuted">{resumen}</div> : null}
      </CardBody>
    </Card>
  )
}
