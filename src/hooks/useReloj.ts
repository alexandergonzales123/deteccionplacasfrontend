import { useEffect, useState } from 'react'

/** Fecha actual que se actualiza cada `intervaloMs` (reloj del header y "hace X s"). */
export function useReloj(intervaloMs = 1000): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), intervaloMs)
    return () => window.clearInterval(id)
  }, [intervaloMs])
  return ahora
}
