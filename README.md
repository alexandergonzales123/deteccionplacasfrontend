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
| `npm run mock`      | Mock del contrato en `localhost:8000` para revisar la UI    |

### Revisar la interfaz sin backend

`mock/api.mjs` implementa todos los endpoints del contrato con datos en memoria
(cámaras de Lima, tránsito simulado que genera detecciones cada pocos segundos,
watchlist, alertas, auditoría y retención). Es solo para revisión visual; no
sustituye al backend.

```bash
npm run mock    # terminal 1 · http://localhost:8000/api/v1
npm run dev     # terminal 2 · http://localhost:5173
```

Usuarios (contraseña `centinela`): `admin@`, `supervisor@`, `operador@` y
`visor@munidemo.gob.pe`. La placa `AKQ-198` tiene un recorrido de 4 puntos y
está en el watchlist; `AKO-198` sirve para probar la búsqueda difusa.

### Contra el backend real

El backend FastAPI vive en `BACK/deteccionplacasbackend` (ver su `README.md`
para la instalación inicial: `alembic upgrade head` y `python -m scripts.seed`).
Con el entorno ya creado y sembrado:

```bash
# terminal 1 · API en http://localhost:8000/api/v1 (docs en /api/v1/docs)
cd BACK/deteccionplacasbackend && .venv/Scripts/activate && uvicorn app.main:app --reload --port 8000

# terminal 2 · tránsito en vivo: heartbeats y detecciones con JPEG desde las 6 cámaras activas de la semilla
cd BACK/deteccionplacasbackend && .venv/Scripts/activate && python -m scripts.simular_edge

# terminal 3 · front
cd FRONT/deteccionplacasfrontend && npm run dev
```

`.env` del front: `VITE_API_BASE_URL=http://localhost:8000/api/v1` (es el valor
por defecto, así que basta con no sobreescribirlo). El backend permite CORS
desde `http://localhost:5173` por defecto (`CORS_ORIGENES`).

Usuarios de demostración (contraseña `centinela`):

| Email | Rol |
| --- | --- |
| `admin@munidemo.gob.pe` | admin |
| `supervisor@munidemo.gob.pe` | supervisor |
| `operador@munidemo.gob.pe` | operador |
| `visor@munidemo.gob.pe` | visor |

Sin `simular_edge` ni dispositivos reales, la tarea de inactividad del backend
(CA-11) pasa las cámaras `activa` a `inactiva` a los 300 s sin heartbeat: es lo
esperado, no un fallo del front.

Diferencias respecto al mock (`mock/api.mjs`) que conviene conocer:

- **Cursores opacos**: todos los listados, incluido `GET /placas/{placa}/eventos`,
  paginan con un cursor `base64url` de `{"t": iso, "id": uuid}`, no con el id de
  la última detección. El front ya lo trata como opaco (`siguienteCursor` se
  reenvía tal cual).
- **El refresh token rota**: cada `POST /auth/refresh` revoca el anterior y
  devuelve un par nuevo. El interceptor de `src/api/client.ts` reutiliza el par
  guardado por otra pestaña si su propio refresh fue rechazado.
- **La evidencia es un JPEG real**: `GET /detecciones/{id}/imagen` devuelve el
  recorte enviado por el edge (410 `IMAGEN_PURGADA` tras la retención).
  `imagenUrl` llega como ruta relativa (`/api/v1/detecciones/{id}/imagen`) y
  nunca se usa como `<img src>`; se descarga por id con bearer.
- **Campos `null` explícitos**: el backend serializa `null` en los opcionales
  sin valor (`ultimoHeartbeat`, `atendidaPor`, `ipOrigen`, `notas`, etc.) en vez
  de omitirlos; los tipos de `src/api/types.ts` lo reflejan.
- **Acción `purga_ejecutada`** en auditoría: no está en el enum del contrato,
  la registra la purga programada (CU-11) con el usuario sintético "Sistema"
  (`id` `00000000-0000-0000-0000-000000000000`, rol `admin`).
- Los 422 de validación llegan como `400 DATOS_INVALIDOS` con el esquema `Error`
  del contrato; el login bloqueado responde `429 CUENTA_BLOQUEADA`.

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
  components/ui/  Componentes genéricos (Card, Badge, Chip, Button, Input, Select, Textarea, Table, Skeleton, EmptyState, Modal)
  components/     ChipConfianza (semáforo de confianza), ChipMotivo (motivo de watchlist), BadgeEstadoAlerta,
                  EvidenciaDeteccion (imagen con bearer) y mapa/MapaAvistamientos (Leaflet, tema oscuro)
  hooks/          Hooks compartidos (alertas nuevas, reloj, imagen de detección) y claves de react-query
  layout/         AppShell (sidebar + contenido; en < md panel deslizante con hamburguesa), Sidebar, PageHeader,
                  CampoShell (vista móvil sin sidebar), definición de la navegación
  lib/            Utilidades puras: fechas, placas, confianza, frescura, watchlist (motivos, vencimiento), iniciales,
                  auditoria (etiquetas de acción, motivo genérico, CSV), retencion (estado de purga, límites)
  pages/          Una carpeta o archivo por pantalla
    LoginPage.tsx
    panel/        Panel en vivo (CU-02)
    busqueda/     Búsqueda por placa y última ubicación (CU-03, CU-04)
    camaras/      Listado, alta/edición/baja y detalle de cámaras (CU-07, CU-08, CU-09)
    watchlist/    Lista de vigilancia: alta, listado y retiro (CU-05)
    alertas/      Bandeja de alertas, detalle y atención (CU-06)
    auditoria/    Registro de consultas, política de retención y su edición (CU-10, CU-11)
    retencion/    Política de retención en solo lectura para cualquier rol (sección 8)
    campo/        Consulta en campo, vista móvil (CU-12)
    NoEncontradoPage.tsx
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
| `/watchlist`          | operador   | CU-05        | Tabla paginada por cursor ("Cargar más"), polling 60 s; filtros `?motivo=` y `?activo=false` (retiradas). Alta en línea y retiro (baja lógica) solo supervisor+; el operador ve el aviso "Solo un supervisor puede agregar placas". Una misma placa puede figurar con varios motivos (1a); `venceEn` se envía en ISO o `null` y las entradas vencidas se marcan "Vencida" en cliente (3a, CA-07). La placa enlaza a `/busqueda?placa=` sin motivo (el operador lo declara allí). |
| `/alertas`            | operador   | CU-06        | Pestañas `?estado=nueva\|revisada\|descartada\|todas` (por defecto Nuevas, con el contador del badge de la nav); rango `?desde`/`?hasta` opcional; cursor con "Cargar más". Polling 15 s solo en Nuevas. Cards con acciones: Ver evidencia, Descartar y Marcar revisada (modal con evidencia embebida, aviso R-05 y comentario obligatorio ≤500); Reabrir solo supervisor+ (3a, CA-13). Cada `PATCH` invalida `['alertas']` (lista, detalle y badge). |
| `/alertas/:alertaId`  | operador   | CU-06        | Detalle con detección completa (OCR vs normalizada, `capturadaEn`/`recibidaEn`, cámara con enlace), evidencia embebida, mapa y las mismas acciones. 404 → "Alerta no encontrada". |
| `/auditoria`          | admin      | CU-10, CU-11 | Selector de día (`?dia=`; por defecto hoy) que fija `desde`/`hasta` a 00:00:00–23:59:59 local; filtros `?usuarioId=` (uuid validado en cliente), `?placa=` (normalizada), `?desde`/`?hasta` (override). Cursor con "Cargar más"; sin polling. Filas con motivo genérico (heurística en `lib/auditoria.ts`, solo para acciones de consulta de placa) resaltadas en ámbar. "Exportar reporte" genera un CSV en cliente con los registros cargados (`auditoria-YYYY-MM-DD.csv`, RFC 4180, BOM UTF-8). Card de retención con estado de purga (al día < 36 h / atrasada / sin registro) y modal de edición con los mín/máx del contrato y confirmación explícita; el `PUT` invalida retención y auditoría. |
| `/retencion`          | visor      | Sección 8    | La misma card de retención en solo lectura más un bloque de transparencia (finalidad, minimización, plazo, trazabilidad). Enlace al pie del sidebar para todos los roles. |
| `/campo`              | operador   | CU-12        | Vista móvil fuera del `AppShell` (`CampoShell`): placa + motivo (chips rápidos que rellenan el motivo), inputs de 56 px y botón de ancho completo. Al pulsar Consultar: `GET /placas/buscar?difusa=false` + `GET /placas/{placa}/ubicacion-actual` + `GET /watchlist?activo=true` (cacheado 60 s) en paralelo. En vigilancia → bloque rojo dominante con motivo, expediente y notas de TODAS las entradas activas (3a) y aviso R-05; si no → verde "Sin vigilancia activa"; si no se pudo verificar → ámbar "Vigilancia no verificada" (nunca verde por omisión). "Última vez vista" siempre con "No equivale a su ubicación actual." (CU-04). Sin registros → botón "Buscar placas similares" (`difusa=true&distanciaMaxima=1`); elegir una rellena la placa sin re-consultar. |

### Supuestos y huecos del contrato (`TODO(contrato)`)

- No hay endpoint de stream/preview ni de reinicio remoto de cámara: la vista previa es un placeholder y se omite "Reiniciar cámara".
- `umbralInactividadSegundos` no se expone por API; el cliente usa 180 s para colorear el último heartbeat.
- `GET /camaras` no devuelve conteo total: se pagina por cursor (máximo 5 páginas de 200) y se cuenta en cliente.
- No hay endpoint de conteo de alertas: "Nuevas · N" y el badge de la nav listan `estado=nueva&limite=200` y cuentan en cliente ("N+" si hay más páginas).
- No hay `GET /watchlist/{id}`: el detalle de alerta muestra `watchlistId` sin enlace.
- El vencimiento del watchlist se calcula en cliente (`venceEn <= ahora`); el backend decide si esas entradas siguen con `activo=true`.
- Los mapas usan tiles públicos de OpenStreetMap; en intranet hay que servir tiles propios (`TODO(despliegue)`).
- No hay endpoint de exportación de auditoría aunque el enum incluya `exportacion`: el CSV se genera en cliente con lo cargado y, por tanto, esa exportación no queda auditada.
- No hay endpoint de listado de usuarios: el filtro de auditoría recibe el `usuarioId` (uuid) escrito a mano.
- No hay conteo agregado de auditoría: "Consultas de hoy" cuenta los registros cargados ("N+" si hay más páginas). La clasificación "motivo genérico" es una regex en cliente; el backend podría clasificarlo.
- `CandidataPlaca` no trae motivo ni expediente de la vigilancia, y `/placas/buscar` solo devuelve placas con detecciones: la vista de campo cruza SIEMPRE `GET /watchlist?activo=true` (hasta 5 páginas de 200) por `placaNormalizada`. Lo ideal sería que `/placas/buscar` devolviera motivo y expediente.
