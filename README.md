# Centinela · Frontend

Panel web de **Centinela**, sistema ANPR (reconocimiento automático de placas) para municipalidades peruanas. Permite a la central de serenazgo monitorear en vivo las lecturas de placa de la red de cámaras, buscar vehículos por placa, administrar la lista de vigilancia, atender alertas y revisar la auditoría de consultas.

Este repositorio contiene únicamente el cliente. El backend (FastAPI) expone la API descrita en el contrato OpenAPI `openapi-anpr-mvp.yaml` **v0.2.0**; el frontend consume **exclusivamente** esa API.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Cómo correr

```bash
npm install
cp .env.example .env      # ajustar VITE_API_BASE_URL si el backend no está en localhost:8000
npm run dev               # http://localhost:5173
```

Comandos disponibles:

| Comando             | Qué hace                                                    |
| ------------------- | ----------------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo con recarga en caliente              |
| `npm run build`     | Verificación de tipos (`tsc -b`) y build de producción      |
| `npm run preview`   | Sirve el build de producción localmente                     |
| `npm run lint`      | ESLint sobre todo el proyecto                               |
| `npm run typecheck` | Solo verificación de tipos, sin generar build               |

## Variables de entorno

Se leen en tiempo de build desde `.env` (ver `.env.example`).

| Variable            | Descripción                                            | Valor por defecto                 |
| ------------------- | ------------------------------------------------------ | --------------------------------- |
| `VITE_API_BASE_URL` | URL base de la API (`servers[0].url` del contrato)     | `http://localhost:8000/api/v1`    |

## Stack

- Vite + React 18 + TypeScript (modo `strict`)
- Tailwind CSS v3 con tokens de color del tema en `tailwind.config.ts`
- `react-router-dom` v6
- `@tanstack/react-query` para consultas, caché y polling
- `axios` con interceptores de bearer token y renovación automática ante 401 (`POST /auth/refresh`)
- `lucide-react` para íconos, `date-fns` (locale `es`) para fechas
- `leaflet` + `react-leaflet` v4 para los mapas de recorrido y ubicación de cámaras (tiles de OpenStreetMap; ver `TODO(despliegue)` en `src/components/mapa/MapaAvistamientos.tsx` para servir tiles propios en intranet)

Alias de importación: `@/` apunta a `src/`.

## Estructura de carpetas

```
src/
  api/            Cliente HTTP y un módulo por tag del contrato OpenAPI
    types.ts      Tipos TS derivados 1:1 de components.schemas
    client.ts     Instancia axios, interceptores, helpers de error
    auth.ts, camaras.ts, detecciones.ts, placas.ts,
    watchlist.ts, alertas.ts, auditoria.ts, configuracion.ts
  auth/           Sesión: AuthContext/useAuth, persistencia, RequireAuth, RequireRol, permisos
  components/ui/  Componentes genéricos (Card, Badge, Chip, Button, Input, Select, Table, Skeleton, EmptyState, Modal)
  components/     ChipConfianza (semáforo de confianza) y mapa/MapaAvistamientos (Leaflet, tema oscuro, marcadores numerados)
  hooks/          Hooks compartidos (alertas nuevas, reloj) y claves de react-query
  layout/         AppShell (sidebar + contenido), Sidebar, PageHeader, definición de la navegación
  lib/            Utilidades puras: fechas, placas, confianza, frescura, iniciales
  pages/          Una carpeta o archivo por pantalla
    LoginPage.tsx
    panel/        Panel en vivo (CU-02)
    busqueda/     Búsqueda por placa y última ubicación (CU-03, CU-04)
    camaras/      Listado, alta/edición/baja y detalle de cámaras (CU-07, CU-08, CU-09)
    EnConstruccionPage.tsx, NoEncontradoPage.tsx
  router.tsx      Rutas y roles mínimos por pantalla
  main.tsx        Arranque: QueryClient, AuthProvider, RouterProvider
```

## Relación con el contrato OpenAPI

El proyecto es *spec-driven*: el contrato manda.

- `src/api/types.ts` replica cada schema del contrato con los **mismos nombres de campo** (`placaNormalizada`, `capturadaEn`, `siguienteCursor`, etc.). Si el contrato cambia, ese archivo cambia con él.
- Cada módulo de `src/api/` corresponde a un tag del contrato y expone una función tipada por endpoint, con sus query params. Están completos aunque esta fase use solo algunos.
- Las páginas y componentes llevan comentarios que referencian el caso de uso o criterio de aceptación que implementan (`CU-02 · flujo 4a`, `CA-08`, etc.), tomados de `analisis-diseno-anpr.md`.
- No se inventan endpoints. Cuando el mockup pide un dato que el contrato no ofrece (p. ej. conteos agregados), se aproxima en cliente y se deja un comentario `TODO(contrato)` explicando qué haría falta.

### Control de acceso

La jerarquía de roles del contrato es `visor < operador < supervisor < admin`. `tienePermiso(rol, rolMinimo)` y `<RequireRol minimo="...">` ocultan lo que el backend rechazaría con 403; la autorización real la aplica el backend.

### Sesión

`token`, `refreshToken` y `usuario` se guardan en `localStorage`. Ante un 401 el cliente intenta una renovación con `/auth/refresh` y reintenta la petición; si la renovación falla, cierra la sesión y redirige a `/login`.

## Pantallas implementadas

| Ruta                  | Rol mínimo | Casos de uso | Notas |
| --------------------- | ---------- | ------------ | ----- |
| `/login`              | —          | RF-14        | Ingreso con credenciales institucionales |
| `/`                   | operador   | CU-02        | Panel en vivo, polling 5 s |
| `/busqueda`           | operador   | CU-03, CU-04 | Búsqueda exacta → difusa (3a) → vacío con retención (4a). Comodines `?`/`*` van directo a `/placas/buscar`. Mapa de recorrido + línea de tiempo con frescura (CA-06). Evidencia vía `GET /detecciones/{id}/imagen` (410 = purgada). Solo se consulta al pulsar **Buscar** con motivo declarado (CA-04); `placa`, `desde`, `hasta` van en la URL, el motivo no. |
| `/camaras`            | visor      | CU-07, CU-09 | Stats + tabla con polling 30 s; filtro `?estado=`. Alta/edición/baja solo admin. La `apiKey` del alta se muestra una única vez en un modal bloqueante (CA-14). |
| `/camaras/:camaraId`  | visor      | CU-08        | Detalle con polling 15 s. Sin endpoint de streaming en el contrato: placeholder; cámara `inactiva` muestra desconexión con último heartbeat (2a). Últimas detecciones solo para operador+. |

Watchlist, Alertas y Auditoría siguen como marcadores de posición.

### Supuestos y huecos del contrato (`TODO(contrato)`)

- No hay endpoint de stream/preview ni de reinicio remoto de cámara: la vista previa es un placeholder y se omite "Reiniciar cámara".
- `umbralInactividadSegundos` no se expone por API; el cliente usa 180 s para colorear el último heartbeat.
- `GET /camaras` no devuelve conteo total: se pagina por cursor (máximo 5 páginas de 200) y se cuenta en cliente.
- Los mapas usan tiles públicos de OpenStreetMap; en intranet hay que servir tiles propios (`TODO(despliegue)`).
