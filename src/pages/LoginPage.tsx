/**
 * Ingreso al sistema (transversal, RF-14 / CA-08). Consume POST /auth/login.
 *  - 401 → credenciales inválidas (mensaje del `Error` del contrato)
 *  - 429 → cuenta bloqueada temporalmente (mensaje del contrato)
 */
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { esErrorDeRed, extraerApiError, statusDe } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import type { Rol } from '@/api/types'
import { Button, Input } from '@/components/ui'
import { rutaInicioPorRol } from '@/layout/navegacion'

const VERSION_CONTRATO = 'v0.2.0'

interface EstadoUbicacion {
  desde?: string
}

/**
 * Destino tras autenticarse: la ruta que el usuario intentaba abrir, o la
 * pantalla de inicio de su rol (visor → /camaras, operador+ → /). La raíz no
 * cuenta como "intento" porque es el destino por defecto de RequireAuth.
 */
function destinoPostLogin(rol: Rol | undefined, desde: string | undefined): string {
  if (desde && desde !== '/' && desde !== '/login') return desde
  return rutaInicioPorRol(rol) ?? '/'
}

export function LoginPage() {
  const { autenticado, usuario, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const desde = (location.state as EstadoUbicacion | null)?.desde

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (autenticado) return <Navigate to={destinoPostLogin(usuario?.rol, desde)} replace />

  async function alEnviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Ingrese su correo institucional y su contraseña.')
      return
    }
    setEnviando(true)
    try {
      const u = await login({ email: email.trim(), password })
      navigate(destinoPostLogin(u.rol, desde), { replace: true })
    } catch (err) {
      const status = statusDe(err)
      const api = extraerApiError(err)
      if (status === 401) {
        setError(api?.mensaje ?? 'Correo o contraseña incorrectos.')
      } else if (status === 429) {
        setError(api?.mensaje ?? 'Demasiados intentos fallidos. La cuenta está bloqueada temporalmente.')
      } else if (esErrorDeRed(err)) {
        setError('No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.')
      } else {
        setError(api?.mensaje ?? 'No fue posible iniciar sesión. Intente nuevamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-app lg:grid-cols-2">
      {/* Columna izquierda: presentación */}
      <section className="hidden flex-col justify-between border-r border-border bg-sidebar px-14 py-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold tracking-tight text-fg">Centinela</p>
            <p className="text-[11px] uppercase tracking-wider text-fgDim">ANPR Municipal</p>
          </div>
        </div>

        <div className="max-w-lg">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-fg">
            Detección de placas para seguridad ciudadana
          </h1>
          <p className="mt-5 text-base leading-relaxed text-fgMuted">
            Lectura automática de placas desde las cámaras de videovigilancia municipal, alertas ante vehículos de
            interés y reconstrucción de recorridos para la central de serenazgo.
          </p>
          <ul className="mt-8 space-y-4">
            <li className="flex items-start gap-3 text-sm text-fg">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden />
              <span>Toda consulta de placa queda registrada con usuario y motivo declarado.</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-fg">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden />
              <span>
                Las detecciones sin coincidencia se eliminan a los 60 días, conforme a la política de retención
                vigente.
              </span>
            </li>
          </ul>
        </div>

        <p className="text-xs text-fgDim">Sistema de uso exclusivo para personal autorizado de la municipalidad.</p>
      </section>

      {/* Columna derecha: formulario */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <ShieldCheck className="h-7 w-7 text-primary" aria-hidden />
            <p className="text-lg font-bold text-fg">Centinela</p>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-fg">Ingresar al sistema</h2>
          <p className="mt-1 text-sm text-fgMuted">Use sus credenciales institucionales.</p>

          <form onSubmit={alEnviar} className="mt-8 space-y-5" noValidate>
            <Input
              label="Correo institucional"
              type="email"
              name="email"
              autoComplete="username"
              placeholder="usuario@munidemo.gob.pe"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={enviando}
              required
            />
            <Input
              label="Contraseña"
              type={verPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={enviando}
              required
              sufijo={
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="rounded p-1.5 text-fgDim hover:text-fg"
                >
                  {verPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              }
            />

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            ) : null}

            <Button type="submit" tamano="lg" className="w-full" cargando={enviando}>
              Ingresar
            </Button>

            <div className="flex items-center justify-between text-xs">
              {/* TODO(contrato): no existe endpoint de recuperación de contraseña; el enlace solo orienta. */}
              <a href="#recuperar" className="text-primary hover:underline" onClick={(e) => e.preventDefault()}>
                ¿Olvidó su contraseña?
              </a>
              <span className="font-mono text-fgDim">{VERSION_CONTRATO}</span>
            </div>
          </form>

          <div className="mt-8 rounded-md border border-border bg-panel px-4 py-3 text-xs leading-relaxed text-fgMuted">
            El uso indebido del sistema para consultas ajenas a la función pública constituye falta administrativa y
            queda registrado en la auditoría.
          </div>
        </div>
      </section>
    </div>
  )
}
