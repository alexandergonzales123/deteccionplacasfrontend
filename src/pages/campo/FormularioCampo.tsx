/**
 * CU-12 · paso 2: placa + motivo. Inputs grandes (h-14) y botón de ancho
 * completo para usar con una mano y guantes (RNF-16, CA-12). El motivo es
 * obligatorio (4..200): sin motivo válido el botón queda deshabilitado.
 */
import { useId, useRef, useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { normalizarPlaca, PATRON_PLACA_NORMALIZADA } from '@/lib/placas'

/** Rango del parámetro `Motivo` del contrato. */
const MOTIVO_MIN = 4
const MOTIVO_MAX = 200

/** Atajos que rellenan el motivo; el sereno completa con el número de expediente. */
const MOTIVOS_RAPIDOS = ['Operativo', 'Control vehicular', 'Denuncia'] as const

export interface ValoresCampo {
  /** Ya normalizada (mayúsculas, sin guion). */
  placa: string
  motivo: string
}

interface Props {
  valores: ValoresCampo
  onCambiar: (v: ValoresCampo) => void
  onConsultar: (v: ValoresCampo) => void
  consultando: boolean
}

export function FormularioCampo({ valores, onCambiar, onConsultar, consultando }: Props) {
  const [errorPlaca, setErrorPlaca] = useState<string | null>(null)
  const motivoRef = useRef<HTMLInputElement>(null)
  const idBase = useId()

  const motivoLimpio = valores.motivo.trim()
  const motivoValido = motivoLimpio.length >= MOTIVO_MIN && motivoLimpio.length <= MOTIVO_MAX
  const puedeConsultar = motivoValido && valores.placa.length > 0 && !consultando

  function alEnviar(e: FormEvent) {
    e.preventDefault()
    if (!PATRON_PLACA_NORMALIZADA.test(valores.placa)) {
      setErrorPlaca('La placa debe tener entre 6 y 8 letras o números.')
      return
    }
    if (!motivoValido) return
    onConsultar({ placa: valores.placa, motivo: motivoLimpio })
  }

  function usarMotivoRapido(texto: string) {
    onCambiar({ ...valores, motivo: `${texto} ` })
    // El foco pasa al motivo para que agregue el número de expediente.
    const input = motivoRef.current
    if (input) {
      input.focus()
      const fin = texto.length + 1
      window.requestAnimationFrame(() => input.setSelectionRange(fin, fin))
    }
  }

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-placa`} className="text-[11px] font-semibold uppercase tracking-wider text-fgMuted">
          Placa
        </label>
        <input
          id={`${idBase}-placa`}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder="AKQ-198"
          maxLength={9}
          value={valores.placa}
          onChange={(e) => {
            // Acepta guion y minúsculas; se normaliza al vuelo. Sin comodines en campo.
            onCambiar({ ...valores, placa: normalizarPlaca(e.target.value).replace(/[?*]/g, '') })
            if (errorPlaca) setErrorPlaca(null)
          }}
          aria-invalid={errorPlaca ? true : undefined}
          aria-describedby={errorPlaca ? `${idBase}-placa-error` : undefined}
          className={cn(
            'h-14 w-full rounded-md border bg-panel px-4 text-center font-mono text-2xl font-bold uppercase tracking-[0.2em] text-fg placeholder:text-fgDim placeholder:tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-primary/50',
            errorPlaca ? 'border-danger' : 'border-border focus:border-primary',
          )}
          data-testid="campo-placa"
        />
        {errorPlaca ? (
          <p id={`${idBase}-placa-error`} className="text-sm text-danger">
            {errorPlaca}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-motivo`} className="text-[11px] font-semibold uppercase tracking-wider text-fgMuted">
          Motivo
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Motivos rápidos">
          {MOTIVOS_RAPIDOS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => usarMotivoRapido(m)}
              className="min-h-[44px] rounded-full border border-border bg-panel px-4 text-sm font-semibold text-fgMuted transition-colors hover:border-primary/60 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {m}
            </button>
          ))}
        </div>
        <input
          ref={motivoRef}
          id={`${idBase}-motivo`}
          type="text"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Denuncia DEN-2026-4471"
          maxLength={MOTIVO_MAX}
          required
          value={valores.motivo}
          onChange={(e) => onCambiar({ ...valores, motivo: e.target.value })}
          aria-invalid={valores.motivo.length > 0 && !motivoValido ? true : undefined}
          className="h-14 w-full rounded-md border border-border bg-panel px-4 text-xl text-fg placeholder:text-fgDim focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          data-testid="campo-motivo"
        />
        <p className={cn('text-xs', valores.motivo.length > 0 && !motivoValido ? 'text-danger' : 'text-fgDim')}>
          {valores.motivo.length > 0 && !motivoValido
            ? `Entre ${MOTIVO_MIN} y ${MOTIVO_MAX} caracteres.`
            : 'Obligatorio. Queda registrado en auditoría con su usuario.'}
        </p>
      </div>

      <Button type="submit" tamano="lg" className="h-14 min-h-[56px] w-full text-base" disabled={!puedeConsultar} cargando={consultando}>
        {!consultando ? <Search className="h-5 w-5" aria-hidden /> : null}
        Consultar
      </Button>
    </form>
  )
}
