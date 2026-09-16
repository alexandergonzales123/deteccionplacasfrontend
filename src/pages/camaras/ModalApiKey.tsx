/**
 * CA-14 / CU-07 paso 2: la `apiKey` del dispositivo se muestra UNA SOLA VEZ
 * tras `POST /camaras` y no vuelve a ser recuperable. El modal es bloqueante
 * (ni Escape ni clic fuera) y solo se cierra tras confirmar que se guardó.
 */
import { useEffect, useRef, useState } from 'react'
import { Check, Copy, KeyRound } from 'lucide-react'
import { Button, Modal } from '@/components/ui'

interface Props {
  apiKey: string | null
  nombreCamara: string
  onCerrar: () => void
}

export function ModalApiKey({ apiKey, nombreCamara, onCerrar }: Props) {
  const [guardada, setGuardada] = useState(false)
  const [copiada, setCopiada] = useState(false)
  const temporizador = useRef<number | null>(null)

  useEffect(() => {
    if (apiKey) {
      setGuardada(false)
      setCopiada(false)
    }
  }, [apiKey])

  useEffect(() => {
    return () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current)
    }
  }, [])

  async function copiar() {
    if (!apiKey) return
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopiada(true)
      if (temporizador.current !== null) window.clearTimeout(temporizador.current)
      temporizador.current = window.setTimeout(() => setCopiada(false), 2500)
    } catch {
      // Sin permiso de portapapeles (p. ej. contexto no seguro): el usuario puede seleccionar el texto.
      setCopiada(false)
    }
  }

  return (
    <Modal
      abierto={apiKey !== null}
      onCerrar={onCerrar}
      bloqueante
      tamano="md"
      titulo={
        <span className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-warn" aria-hidden />
          Clave del dispositivo · se muestra UNA SOLA VEZ
        </span>
      }
      descripcion={`Cámara "${nombreCamara}" registrada. Configure el dispositivo edge con esta clave.`}
      pie={
        <Button className="min-h-[44px]" disabled={!guardada} onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      <div className="rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
        Esta clave no vuelve a ser recuperable desde la interfaz. Si se pierde, deberá registrar la cámara de nuevo.
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <code
          className="min-h-[44px] flex-1 select-all break-all rounded-md border border-border bg-app px-3 py-2.5 font-mono text-sm text-fg"
          aria-label="Clave del dispositivo"
        >
          {apiKey}
        </code>
        <Button variante="secundario" className="min-h-[44px] shrink-0" onClick={copiar}>
          {copiada ? <Check className="h-4 w-4 text-ok" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copiada ? 'Copiada' : 'Copiar'}
        </Button>
      </div>

      <label className="mt-5 flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-fg">
        <input
          type="checkbox"
          checked={guardada}
          onChange={(e) => setGuardada(e.target.checked)}
          className="h-5 w-5 rounded border-border bg-app accent-[#00b4d8]"
        />
        He guardado la clave en un lugar seguro
      </label>
    </Modal>
  )
}
