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
  components/ui/  Componentes genéricos (Card, Badge, Chip, Button, Input, Table, Skeleton, EmptyState)
  hooks/          Hooks compartidos (alertas nuevas, reloj) y claves de react-query
  layout/         AppShell (sidebar + contenido), Sidebar, PageHeader, definición de la navegación
  lib/            Utilidades puras: fechas, placas, confianza, iniciales
  pages/          Una carpeta o archivo por pantalla
    LoginPage.tsx
    panel/        Panel en vivo (CU-02)
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

## Estado de esta fase

Implementado: scaffold, tipos y cliente completo del contrato, autenticación, layout con navegación por rol, pantalla de ingreso y Panel en vivo. Las pantallas de Búsqueda por placa, Cámaras, Watchlist, Alertas y Auditoría son marcadores de posición.
