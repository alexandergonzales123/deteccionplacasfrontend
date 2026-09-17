/**
 * CU-12 · Consulta en campo (rol operador). Vista móvil fuera del AppShell.
 * La consulta se dispara SOLO al pulsar Consultar (queda auditada): no hay
 * auto-ejecución, polling ni refetch por foco. Sin reintentos: un timeout ya
 * pudo quedar auditado.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { mensajeDeError, statusDe } from '@/api/client'
import { CampoShell } from '@/layout/CampoShell'
import { buscarSimilares, consultarCampo, type ParametrosCampo } from './consultarCampo'
import { FormularioCampo, type ValoresCampo } from './FormularioCampo'
import { ResultadoCampo } from './ResultadoCampo'

function mensajeConsulta(err: unknown): string {
  if (statusDe(err) === 403) return 'Su rol no permite consultar placas.'
  return mensajeDeError(err, 'No se pudo completar la consulta. Intente nuevamente.')
}

export function CampoPage() {
  const queryClient = useQueryClient()
  const [valores, setValores] = useState<ValoresCampo>({ placa: '', motivo: '' })

  const consulta = useMutation({
    mutationFn: (p: ParametrosCampo) => consultarCampo(p, queryClient),
    retry: false,
  })
  const similares = useMutation({
    mutationFn: buscarSimilares,
    retry: false,
  })
  const { reset: resetConsulta, mutate: ejecutarConsulta } = consulta
  const { reset: resetSimilares, mutate: pedirSimilares } = similares

  const consultar = useCallback(
    (v: ValoresCampo) => {
      resetSimilares()
      ejecutarConsulta({ placa: v.placa, motivo: v.motivo })
    },
    [ejecutarConsulta, resetSimilares],
  )

  // Limpia el resultado y la placa; el motivo se conserva para la siguiente consulta.
  const nuevaConsulta = useCallback(() => {
    resetConsulta()
    resetSimilares()
    setValores((v) => ({ ...v, placa: '' }))
  }, [resetConsulta, resetSimilares])

  // Elegir una similar rellena la placa; NO consulta sola (cada consulta es auditada).
  const elegirPlaca = useCallback(
    (placaNormalizada: string) => {
      resetConsulta()
      resetSimilares()
      setValores((v) => ({ ...v, placa: placaNormalizada }))
    },
    [resetConsulta, resetSimilares],
  )

  // En teléfono el resultado queda bajo el formulario: se lleva a la vista al llegar (CA-12).
  const resultadoRef = useRef<HTMLDivElement>(null)
  const resultado = consulta.data
  useEffect(() => {
    if (resultado) resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [resultado])

  const buscarSimilaresDeUltima = useCallback(() => {
    if (consulta.variables) pedirSimilares(consulta.variables)
  }, [consulta.variables, pedirSimilares])

  return (
    <CampoShell>
      <h1 className="text-lg font-bold tracking-tight text-fg">Consulta en campo</h1>
      <p className="mb-4 text-sm text-fgMuted">Verifique si una placa está en vigilancia y cuándo fue vista.</p>

      <FormularioCampo valores={valores} onCambiar={setValores} onConsultar={consultar} consultando={consulta.isPending} />

      {consulta.isError ? (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-base text-danger">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span>{mensajeConsulta(consulta.error)}</span>
        </div>
      ) : null}

      {resultado ? (
        <div ref={resultadoRef} className="mt-5 scroll-mt-16">
          <ResultadoCampo
            resultado={resultado}
            onNuevaConsulta={nuevaConsulta}
            similares={{
              data: similares.data,
              cargando: similares.isPending,
              error: similares.isError ? mensajeConsulta(similares.error) : null,
            }}
            onBuscarSimilares={buscarSimilaresDeUltima}
            onElegirPlaca={elegirPlaca}
          />
        </div>
      ) : null}
    </CampoShell>
  )
}
