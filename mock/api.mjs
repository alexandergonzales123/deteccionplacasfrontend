// Mock del contrato OpenAPI v0.2.0 para revisar la interfaz sin backend.
// Datos en memoria, se reinician al arrancar. No sustituye al backend real.
//
//   npm run mock          → http://localhost:8000/api/v1
//   npm run dev           → http://localhost:5173
//
// Usuarios (contraseña: centinela):
//   admin@munidemo.gob.pe · supervisor@munidemo.gob.pe
//   operador@munidemo.gob.pe · visor@munidemo.gob.pe
import http from 'node:http'
import { randomUUID } from 'node:crypto'

const PUERTO = Number(process.env.MOCK_PORT ?? 8000)
const PREFIJO = '/api/v1'
const CLAVE = 'centinela'

// ------------------------------------------------------------ utilidades --
const ahora = () => Date.now()
const iso = (ms) => new Date(ms).toISOString()
const min = 60_000
const hora = 60 * min
const dia = 24 * hora
const normalizar = (p) => String(p ?? '').toUpperCase().replace(/[^A-Z0-9?*]/g, '')
const azar = (arr) => arr[Math.floor(Math.random() * arr.length)]
const entre = (a, b) => a + Math.random() * (b - a)
const codificarCursor = (n) => Buffer.from(String(n)).toString('base64url')
const decodificarCursor = (c) => (c ? Number(Buffer.from(c, 'base64url').toString()) || 0 : 0)

function paginar(items, url) {
  const limite = Math.min(Math.max(Number(url.searchParams.get('limite') ?? 50), 1), 200)
  const desde = decodificarCursor(url.searchParams.get('cursor'))
  const pagina = items.slice(desde, desde + limite)
  const siguiente = desde + limite < items.length ? codificarCursor(desde + limite) : null
  return { items: pagina, siguienteCursor: siguiente }
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}

function coincideComodin(patron, placa) {
  const re = new RegExp('^' + patron.replace(/\?/g, '.').replace(/\*/g, '.*') + '$')
  return re.test(placa)
}

// ---------------------------------------------------------------- usuarios --
const USUARIOS = [
  { id: 'b0c1d2e3-f4a5-4b6c-8d7e-9f0a1b2c3d4e', nombre: 'Carla Rojas', email: 'admin@munidemo.gob.pe', rol: 'admin', activo: true },
  { id: '3f2b6a10-1c4e-4c0a-9d1e-2b7f8a9c0d11', nombre: 'Marcos Torres', email: 'supervisor@munidemo.gob.pe', rol: 'supervisor', activo: true },
  { id: '7a1c2d30-5e6f-4a7b-8c9d-0e1f2a3b4c5d', nombre: 'Julia Ramírez', email: 'operador@munidemo.gob.pe', rol: 'operador', activo: true },
  { id: '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a', nombre: 'Luis Vega', email: 'visor@munidemo.gob.pe', rol: 'visor', activo: true },
]
const JERARQUIA = { visor: 0, operador: 1, supervisor: 2, admin: 3 }
const sesiones = new Map() // token → usuario

// ----------------------------------------------------------------- camaras --
const CAMARAS = [
  ['Av. Javier Prado Este / Av. Aviación', -12.0894, -76.9997, 'activa', 'varifocal', 8.4, '192.168.10.24'],
  ['Panamericana Sur, km 19', -12.2415, -76.9256, 'activa', 'varifocal', 12, '192.168.10.31'],
  ['Av. Arequipa, cdra. 28', -12.0932, -77.0295, 'activa', 'fijo', 6, '192.168.10.18'],
  ['Av. La Marina / Av. Universitaria', -12.0776, -77.0819, 'mantenimiento', 'varifocal', 8, '192.168.10.40'],
  ['Jr. de la Unión', -12.0464, -77.0338, 'activa', 'fijo', 4, '192.168.10.12'],
  ['Circuito de Playas, Costa Verde', -12.1257, -77.0453, 'activa', 'varifocal', 10, '192.168.10.55'],
  ['Av. Angamos Este / Av. Aviación', -12.1089, -76.9987, 'activa', 'varifocal', 8.4, '192.168.10.27'],
  ['Av. Brasil / Av. Salaverry', -12.0785, -77.0532, 'inactiva', 'fijo', 6, '192.168.10.61'],
].map(([nombre, latitud, longitud, estado, tipoLente, distanciaFocalMm, ip], i) => ({
  id: `c${String(i + 1).padStart(7, '0')}-0000-4000-8000-00000000000${i + 1}`,
  nombre, latitud, longitud, estado, tipoLente, distanciaFocalMm,
  resolucion: '1920x1080', fps: 25, ipDispositivo: ip,
  ultimoHeartbeatEn: estado === 'inactiva' ? iso(ahora() - 2 * dia) : estado === 'mantenimiento' ? iso(ahora() - 3 * hora) : iso(ahora() - 30_000),
  creadaEn: iso(ahora() - 120 * dia),
  dadaDeBaja: false,
}))
const camaraRef = (c) => ({ id: c.id, nombre: c.nombre, latitud: c.latitud, longitud: c.longitud })
const camaraPublica = ({ ipDispositivo, dadaDeBaja, apiKeyHash, ...c }) => c

// --------------------------------------------------------------- watchlist --
const WATCHLIST = [
  ['AKQ198', 'robado', 'Denuncia DEN-2026-4471', 'Reportado por la propietaria, sustraído en San Borja. Toyota Yaris gris.', 12, USUARIOS[2]],
  ['B3X742', 'requisitoriado', 'Oficio 218-2026-GSC', 'Orden judicial vigente', null, USUARIOS[1]],
  ['T4P220', 'moroso_papeletas', 'SAT-2026-88120', '8 papeletas impagas acumuladas', null, USUARIOS[1]],
  ['C9L561', 'robado', 'Denuncia DEN-2026-4502', 'Robo reportado en Surco', 30, USUARIOS[2]],
  ['AB3390', 'otro', 'Memo 55-2026-GSC', 'Seguimiento por denuncia vecinal', null, USUARIOS[1]],
  ['AKQ198', 'moroso_papeletas', 'SAT-2026-90031', null, null, USUARIOS[1]],
].map(([placa, motivo, ref, notas, venceDias, por], i) => ({
  id: `a1000000-0000-4000-8000-0000000000${String(i + 1).padStart(2, '0')}`,
  placa, placaNormalizada: placa, motivo, notas: notas ?? undefined, referenciaExpediente: ref,
  venceEn: venceDias ? iso(ahora() + venceDias * dia) : null,
  activo: true, agregadoEn: iso(ahora() - (i + 2) * dia), agregadoPor: por,
}))

// -------------------------------------------------------------- detecciones --
const PLACAS_COMUNES = ['B9X742', 'T9M305', 'C1H884', 'AB5521', 'D7Z260', 'F2K913', 'M4R771', 'H8P204', 'AKO198', 'P2R806', 'W1N550', 'Z6Q318', 'K3V492', 'A7B123', 'N9T640', 'ABC123', 'BCD234', 'CDE345', 'DEF456', 'EFG567']
const DETECCIONES = []
const ALERTAS = []
const AUDITORIA = []
const IMAGENES_PURGADAS = new Set()

function crearDeteccion(placaNormalizada, camara, capturadaMs, confianza) {
  const id = randomUUID()
  const cruda = placaNormalizada.length === 6 ? `${placaNormalizada.slice(0, 3)}-${placaNormalizada.slice(3)}` : placaNormalizada
  const d = {
    id, placa: cruda, placaNormalizada, confianza: Number(confianza.toFixed(2)),
    capturadaEn: iso(capturadaMs), recibidaEn: iso(capturadaMs + 1200),
    camara: camaraRef(camara), imagenUrl: `${PREFIJO}/detecciones/${id}/imagen`,
    generoAlerta: false, alertaId: null,
  }
  const vigiladas = WATCHLIST.filter((w) => w.activo && w.placaNormalizada === placaNormalizada && (!w.venceEn || new Date(w.venceEn).getTime() > capturadaMs))
  if (vigiladas.length && confianza >= 0.7) {
    const w = vigiladas[0]
    const alerta = {
      id: randomUUID(), placaNormalizada, motivoWatchlist: w.motivo, watchlistId: w.id,
      deteccion: d, estado: 'nueva', comentario: null, creadaEn: iso(capturadaMs + 1500), atendidaPor: undefined, atendidaEn: null,
    }
    d.generoAlerta = true
    d.alertaId = alerta.id
    ALERTAS.unshift(alerta)
  }
  DETECCIONES.unshift(d)
  return d
}

function sembrar() {
  const activas = CAMARAS.filter((c) => c.estado === 'activa')
  // Tránsito de las últimas 24 h.
  for (let i = 0; i < 400; i++) {
    crearDeteccion(azar(PLACAS_COMUNES), azar(activas), ahora() - entre(2 * min, 24 * hora), entre(0.68, 0.995))
  }
  // Recorrido de AKQ-198 como en el mockup de Búsqueda (4 puntos, del más antiguo al más reciente).
  const ruta = [[CAMARAS[1], 27 * hora], [CAMARAS[2], 146 * min], [CAMARAS[0], 49 * min], [CAMARAS[6], 3 * min]]
  for (const [cam, hace] of ruta) crearDeteccion('AKQ198', cam, ahora() - hace, entre(0.93, 0.98))
  // Otras placas vigiladas vistas hoy (generan alertas).
  crearDeteccion('B3X742', CAMARAS[0], ahora() - 12_000, 0.98)
  crearDeteccion('C9L561', CAMARAS[2], ahora() - 3 * min, 0.91)
  crearDeteccion('T4P220', CAMARAS[4], ahora() - 5 * hora, 0.88)
  crearDeteccion('AB3390', CAMARAS[7], ahora() - 30 * hora, 0.86)
  DETECCIONES.sort((a, b) => (a.capturadaEn < b.capturadaEn ? 1 : -1))
  ALERTAS.sort((a, b) => (a.creadaEn < b.creadaEn ? 1 : -1))
  // Algunas alertas ya atendidas.
  const t4p = ALERTAS.find((a) => a.placaNormalizada === 'T4P220')
  if (t4p) Object.assign(t4p, { estado: 'revisada', comentario: 'Unidad 12 verificó el vehículo; propietario notificado.', atendidaPor: USUARIOS[1], atendidaEn: iso(ahora() - 4 * hora) })
  const ab = ALERTAS.find((a) => a.placaNormalizada === 'AB3390')
  if (ab) Object.assign(ab, { estado: 'descartada', comentario: 'Falso positivo: la placa real es AB-3396.', atendidaPor: USUARIOS[2], atendidaEn: iso(ahora() - 28 * hora) })
  // Una imagen purgada para probar el 410.
  const antigua = DETECCIONES[DETECCIONES.length - 1]
  IMAGENES_PURGADAS.add(antigua.id)
  antigua.imagenUrl = null
  // Auditoría previa.
  const previas = [
    [USUARIOS[2], 'consulta_avistamientos', 'AKQ198', 'Denuncia DEN-2026-4471', '10.4.12.31', 3 * min],
    [USUARIOS[1], 'alta_watchlist', 'C9L561', 'Oficio 218-2026-GSC', '10.4.12.18', 87 * min],
    [USUARIOS[3], 'consulta_avistamientos', 'P2R806', 'Verificación', '10.4.12.44', 19 * hora],
    [USUARIOS[2], 'descarga_imagen', 'B3X742', 'Orden judicial EXP-1129-2026', '10.4.12.31', 2.6 * hora],
    [USUARIOS[2], 'busqueda_placa', 'AKO198', 'Operativo Av. Aviación', '10.4.12.52', 2.8 * hora],
    [USUARIOS[0], 'cambio_retencion', null, 'De 90 a 60 días, acuerdo de gerencia', '10.4.12.5', 4 * dia],
  ]
  for (const [u, accion, placa, motivo, ip, hace] of previas) {
    AUDITORIA.push({ id: randomUUID(), usuario: u, accion, placaConsultada: placa, motivo, ipOrigen: ip, realizadaEn: iso(ahora() - hace) })
  }
}

function auditar(usuario, accion, placaConsultada, motivo, req) {
  AUDITORIA.unshift({
    id: randomUUID(), usuario, accion, placaConsultada: placaConsultada ?? null, motivo: motivo ?? null,
    ipOrigen: req.socket.remoteAddress?.replace('::ffff:', '') ?? '127.0.0.1', realizadaEn: iso(ahora()),
  })
}

// Tránsito en vivo: una detección nueva cada pocos segundos en cámaras activas.
setInterval(() => {
  const activas = CAMARAS.filter((c) => c.estado === 'activa' && !c.dadaDeBaja)
  if (!activas.length) return
  const vigilada = Math.random() < 0.04 ? azar(WATCHLIST.filter((w) => w.activo)).placaNormalizada : null
  crearDeteccion(vigilada ?? azar(PLACAS_COMUNES), azar(activas), ahora() - 800, entre(0.7, 0.995))
  if (DETECCIONES.length > 5000) DETECCIONES.length = 5000
  for (const c of activas) c.ultimoHeartbeatEn = iso(ahora() - Math.floor(entre(5_000, 55_000)))
}, 4_000)

let RETENCION = {
  diasDeteccionesSinAlerta: 60, diasDeteccionesConAlerta: 365, diasImagenes: 30, diasAuditoria: 1095,
  actualizadaEn: iso(ahora() - 4 * dia), actualizadaPor: USUARIOS[0],
  ultimaPurgaEn: iso(new Date().setHours(3, 0, 0, 0)), registrosPurgadosUltimaEjecucion: 41_892,
}

// ------------------------------------------------------------- respuestas --
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Device-Api-Key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Cache-Control': 'no-store',
}
const json = (res, codigo, cuerpo) => {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', ...CORS })
  res.end(cuerpo === undefined ? '' : JSON.stringify(cuerpo))
}
const error = (res, codigo, cod, mensaje) => json(res, codigo, { codigo: cod, mensaje })
const leerJson = (req) => new Promise((ok) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}) } catch { ok({}) } }) })

function imagenPlaca(placa, camara, fecha) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
  <rect width="480" height="270" fill="#1a1f2a"/>
  <rect x="0" y="180" width="480" height="90" fill="#2a2f3a"/>
  <rect x="120" y="70" width="240" height="110" rx="10" fill="#0b0e14" stroke="#3a4150" stroke-width="4"/>
  <rect x="136" y="86" width="208" height="78" rx="6" fill="#f4f1e6"/>
  <text x="240" y="140" text-anchor="middle" font-family="monospace" font-size="42" font-weight="bold" fill="#111">${placa}</text>
  <text x="12" y="22" font-family="monospace" font-size="13" fill="#9fb3c8">${camara}</text>
  <text x="12" y="258" font-family="monospace" font-size="12" fill="#9fb3c8">${fecha}</text>
  <text x="468" y="258" text-anchor="end" font-family="monospace" font-size="12" fill="#f59e0b">MOCK · sin cámara real</text>
</svg>`
  return Buffer.from(svg)
}

// ----------------------------------------------------------------- servidor --
sembrar()

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end() }
  if (!url.pathname.startsWith(PREFIJO)) return error(res, 404, 'NO_ENCONTRADO', 'Ruta fuera de /api/v1')
  const ruta = url.pathname.slice(PREFIJO.length)
  const q = (k) => url.searchParams.get(k)
  console.log(new Date().toLocaleTimeString(), req.method, ruta + url.search)

  // --- auth (sin bearer)
  if (ruta === '/auth/login' && req.method === 'POST') {
    const { email, password } = await leerJson(req)
    const u = USUARIOS.find((x) => x.email === String(email ?? '').toLowerCase())
    if (!u || password !== CLAVE) return error(res, 401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos')
    const token = `tok-${randomUUID()}`, refreshToken = `ref-${randomUUID()}`
    sesiones.set(token, u); sesiones.set(refreshToken, u)
    return json(res, 200, { token, refreshToken, expiraEn: 3600, usuario: u })
  }
  if (ruta === '/auth/refresh' && req.method === 'POST') {
    const { refreshToken } = await leerJson(req)
    const u = sesiones.get(refreshToken)
    if (!u) return error(res, 401, 'REFRESH_INVALIDO', 'Sesión expirada')
    const token = `tok-${randomUUID()}`
    sesiones.set(token, u)
    return json(res, 200, { token, refreshToken, expiraEn: 3600, usuario: u })
  }

  // --- ingesta edge (API key de cámara)
  const apiKey = req.headers['x-device-api-key']
  if (apiKey) {
    const cam = CAMARAS.find((c) => c.apiKeyHash === apiKey)
    if (!cam) return error(res, 401, 'API_KEY_INVALIDA', 'Clave de dispositivo inválida')
    const mHb = ruta.match(/^\/camaras\/([^/]+)\/heartbeat$/)
    if (mHb && req.method === 'POST') {
      if (mHb[1] !== cam.id) return error(res, 403, 'CAMARA_AJENA', 'La clave no corresponde a esta cámara')
      cam.ultimoHeartbeatEn = iso(ahora())
      return json(res, 204)
    }
    if (ruta === '/detecciones' && req.method === 'POST') {
      const b = await leerJson(req)
      if (b.camaraId !== cam.id) return error(res, 403, 'CAMARA_AJENA', 'La clave no corresponde a esta cámara')
      const existente = DETECCIONES.find((d) => d.eventoUuid === b.eventoUuid)
      if (existente) return json(res, 200, existente)
      const placa = normalizar(b.placa)
      if (!/^[A-Z0-9]{6,8}$/.test(placa)) return error(res, 400, 'PLACA_FORMATO_INVALIDO', 'La placa no cumple el formato peruano')
      const d = crearDeteccion(placa, cam, new Date(b.capturadaEn).getTime() || ahora(), Number(b.confianza) || 0.5)
      d.eventoUuid = b.eventoUuid
      return json(res, 201, d)
    }
    return error(res, 403, 'SIN_PERMISO', 'La clave de dispositivo solo habilita ingesta y heartbeat')
  }

  // --- bearer
  const auth = req.headers.authorization ?? ''
  const usuario = auth.startsWith('Bearer ') ? sesiones.get(auth.slice(7)) : undefined
  if (!usuario) return error(res, 401, 'NO_AUTENTICADO', 'Falta el token o es inválido')
  const exige = (rolMinimo) => {
    if (JERARQUIA[usuario.rol] < JERARQUIA[rolMinimo]) { error(res, 403, 'SIN_PERMISO', `Esta operación requiere rol ${rolMinimo}`); return false }
    return true
  }
  const exigeMotivo = () => {
    const m = q('motivo')
    if (!m || m.length < 4 || m.length > 200) { error(res, 400, 'MOTIVO_REQUERIDO', 'El motivo es obligatorio (4 a 200 caracteres)'); return null }
    return m
  }

  if (ruta === '/auth/logout' && req.method === 'POST') { sesiones.delete(auth.slice(7)); return json(res, 204) }
  if (ruta === '/auth/yo') return json(res, 200, usuario)

  // --- cámaras
  if (ruta === '/camaras' && req.method === 'GET') {
    let items = CAMARAS.filter((c) => !c.dadaDeBaja)
    if (q('estado')) items = items.filter((c) => c.estado === q('estado'))
    return json(res, 200, paginar(items.map(camaraPublica), url))
  }
  if (ruta === '/camaras' && req.method === 'POST') {
    if (!exige('admin')) return
    const b = await leerJson(req)
    if (!b.nombre || typeof b.latitud !== 'number' || typeof b.longitud !== 'number') return error(res, 400, 'DATOS_INVALIDOS', 'nombre, latitud y longitud son obligatorios')
    const apiKey = `edge_${randomUUID().replace(/-/g, '')}`
    const c = { id: randomUUID(), nombre: b.nombre, latitud: b.latitud, longitud: b.longitud, estado: b.estado ?? 'activa', tipoLente: b.tipoLente, distanciaFocalMm: b.distanciaFocalMm, resolucion: b.resolucion, fps: b.fps, ultimoHeartbeatEn: null, creadaEn: iso(ahora()), dadaDeBaja: false, apiKeyHash: apiKey }
    CAMARAS.push(c)
    return json(res, 201, { ...camaraPublica(c), apiKey })
  }
  const mCam = ruta.match(/^\/camaras\/([^/]+)$/)
  if (mCam) {
    const c = CAMARAS.find((x) => x.id === mCam[1] && !x.dadaDeBaja)
    if (!c) return error(res, 404, 'NO_ENCONTRADO', 'Cámara no encontrada')
    if (req.method === 'GET') {
      const hb = c.ultimoHeartbeatEn ? {
        enviadoEn: c.ultimoHeartbeatEn, uptimeSegundos: 6 * 86400 + 4321, ultimaCapturaEn: DETECCIONES.find((d) => d.camara.id === c.id)?.capturadaEn ?? null,
        deteccionesEnCola: c.estado === 'activa' ? 0 : 37, almacenamientoLibreMb: 18_240, temperaturaC: 41.5, versionAgente: '1.4.2',
      } : undefined
      const corte = iso(ahora() - dia)
      return json(res, 200, { ...camaraPublica(c), ultimoHeartbeat: hb, deteccionesUltimas24h: DETECCIONES.filter((d) => d.camara.id === c.id && d.capturadaEn >= corte).length })
    }
    if (req.method === 'PUT') {
      if (!exige('admin')) return
      const b = await leerJson(req)
      Object.assign(c, { nombre: b.nombre ?? c.nombre, latitud: b.latitud ?? c.latitud, longitud: b.longitud ?? c.longitud, estado: b.estado ?? c.estado, tipoLente: b.tipoLente, distanciaFocalMm: b.distanciaFocalMm, resolucion: b.resolucion, fps: b.fps })
      return json(res, 200, camaraPublica(c))
    }
    if (req.method === 'DELETE') { if (!exige('admin')) return; c.dadaDeBaja = true; return json(res, 204) }
  }

  // --- detecciones
  if (ruta === '/detecciones' && req.method === 'GET') {
    if (!exige('operador')) return
    const minConf = Number(q('confianzaMinima') ?? 0.7)
    let items = DETECCIONES.filter((d) => d.confianza >= minConf)
    if (q('camaraId')) items = items.filter((d) => d.camara.id === q('camaraId'))
    if (q('desde')) items = items.filter((d) => d.capturadaEn >= q('desde'))
    if (q('hasta')) items = items.filter((d) => d.capturadaEn <= q('hasta'))
    if (q('soloAlertas') === 'true') items = items.filter((d) => d.generoAlerta)
    return json(res, 200, paginar(items, url))
  }
  const mImg = ruta.match(/^\/detecciones\/([^/]+)\/imagen$/)
  if (mImg) {
    if (!exige('operador')) return
    const d = DETECCIONES.find((x) => x.id === mImg[1])
    if (!d) return error(res, 404, 'NO_ENCONTRADO', 'Detección no encontrada')
    if (IMAGENES_PURGADAS.has(d.id)) return error(res, 410, 'IMAGEN_PURGADA', 'La imagen fue purgada según la política de retención')
    auditar(usuario, 'descarga_imagen', d.placaNormalizada, null, req)
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', ...CORS })
    return res.end(imagenPlaca(d.placa, d.camara.nombre, d.capturadaEn))
  }

  // --- placas
  if (ruta === '/placas/buscar') {
    if (!exige('operador')) return
    const motivo = exigeMotivo(); if (!motivo) return
    const patron = normalizar(q('patron'))
    const difusa = q('difusa') !== 'false'
    const maxDist = Math.min(Math.max(Number(q('distanciaMaxima') ?? 1), 1), 2)
    auditar(usuario, 'busqueda_placa', patron, motivo, req)
    const porPlaca = new Map()
    for (const d of DETECCIONES) {
      const e = porPlaca.get(d.placaNormalizada) ?? { placaNormalizada: d.placaNormalizada, avistamientos: 0, ultimoAvistamientoEn: d.capturadaEn }
      e.avistamientos++
      if (d.capturadaEn > e.ultimoAvistamientoEn) e.ultimoAvistamientoEn = d.capturadaEn
      porPlaca.set(d.placaNormalizada, e)
    }
    const conComodin = /[?*]/.test(patron)
    const candidatas = []
    for (const e of porPlaca.values()) {
      let distancia
      if (conComodin) { if (!coincideComodin(patron, e.placaNormalizada)) continue; distancia = 0 }
      else { distancia = levenshtein(patron, e.placaNormalizada); if (distancia > (difusa ? maxDist : 0)) continue }
      candidatas.push({ ...e, distancia, coincidenciaExacta: distancia === 0 && !conComodin, enWatchlist: WATCHLIST.some((w) => w.activo && w.placaNormalizada === e.placaNormalizada) })
    }
    candidatas.sort((a, b) => a.distancia - b.distancia || b.avistamientos - a.avistamientos)
    return json(res, 200, candidatas.slice(0, 20))
  }
  const mPlaca = ruta.match(/^\/placas\/([A-Z0-9]{6,8})\/(avistamientos|ubicacion-actual|eventos)$/)
  if (mPlaca) {
    if (!exige('operador')) return
    const [, placa, sub] = mPlaca
    const propias = DETECCIONES.filter((d) => d.placaNormalizada === placa)
    if (sub === 'avistamientos') {
      const motivo = exigeMotivo(); if (!motivo) return
      auditar(usuario, 'consulta_avistamientos', placa, motivo, req)
      let items = propias
      if (q('desde')) items = items.filter((d) => d.capturadaEn >= q('desde'))
      if (q('hasta')) items = items.filter((d) => d.capturadaEn <= q('hasta'))
      return json(res, 200, paginar(items, url))
    }
    if (sub === 'ubicacion-actual') {
      const motivo = exigeMotivo(); if (!motivo) return
      auditar(usuario, 'consulta_ubicacion_actual', placa, motivo, req)
      const ultimo = propias[0]
      if (!ultimo) return error(res, 404, 'SIN_AVISTAMIENTOS', 'La placa no tiene avistamientos en el periodo retenido')
      const seg = Math.floor((ahora() - new Date(ultimo.capturadaEn).getTime()) / 1000)
      const frescura = seg < 300 ? 'reciente' : seg < 3600 ? 'probable' : 'antiguo'
      const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60)
      return json(res, 200, { avistamiento: ultimo, antiguedadSegundos: seg, frescura, advertencia: `Último avistamiento hace ${h ? h + ' h ' : ''}${m} min. No constituye ubicación actual del vehículo.` })
    }
    if (sub === 'eventos') {
      const desdeCursor = q('desdeCursor')
      const idx = propias.findIndex((d) => d.id === desdeCursor)
      const nuevos = idx > 0 ? propias.slice(0, idx) : idx === 0 ? [] : propias.slice(0, 5)
      return json(res, 200, { items: nuevos, siguienteCursor: nuevos[0]?.id ?? desdeCursor })
    }
  }
  if (ruta.startsWith('/placas/')) return error(res, 400, 'PLACA_FORMATO_INVALIDO', 'La placa debe ser [A-Z0-9]{6,8}')

  // --- watchlist
  if (ruta === '/watchlist' && req.method === 'GET') {
    if (!exige('operador')) return
    const activo = q('activo') !== 'false'
    let items = WATCHLIST.filter((w) => w.activo === activo)
    if (q('motivo')) items = items.filter((w) => w.motivo === q('motivo'))
    return json(res, 200, paginar(items, url))
  }
  if (ruta === '/watchlist' && req.method === 'POST') {
    if (!exige('supervisor')) return
    const b = await leerJson(req)
    const placa = normalizar(b.placa)
    if (!/^[A-Z0-9]{6,8}$/.test(placa)) return error(res, 400, 'PLACA_FORMATO_INVALIDO', 'La placa no cumple el formato peruano')
    if (!b.motivo || !b.referenciaExpediente) return error(res, 400, 'DATOS_INVALIDOS', 'motivo y referenciaExpediente son obligatorios')
    const w = { id: randomUUID(), placa: b.placa, placaNormalizada: placa, motivo: b.motivo, notas: b.notas, referenciaExpediente: b.referenciaExpediente, venceEn: b.venceEn ?? null, activo: true, agregadoEn: iso(ahora()), agregadoPor: usuario }
    WATCHLIST.unshift(w)
    auditar(usuario, 'alta_watchlist', placa, b.referenciaExpediente, req)
    return json(res, 201, w)
  }
  const mWl = ruta.match(/^\/watchlist\/([^/]+)$/)
  if (mWl && req.method === 'DELETE') {
    if (!exige('supervisor')) return
    const w = WATCHLIST.find((x) => x.id === mWl[1])
    if (!w) return error(res, 404, 'NO_ENCONTRADO', 'Entrada no encontrada')
    w.activo = false
    auditar(usuario, 'baja_watchlist', w.placaNormalizada, w.referenciaExpediente, req)
    return json(res, 204)
  }

  // --- alertas
  if (ruta === '/alertas' && req.method === 'GET') {
    if (!exige('operador')) return
    let items = ALERTAS
    if (q('estado')) items = items.filter((a) => a.estado === q('estado'))
    if (q('desde')) items = items.filter((a) => a.creadaEn >= q('desde'))
    if (q('hasta')) items = items.filter((a) => a.creadaEn <= q('hasta'))
    return json(res, 200, paginar(items, url))
  }
  const mAl = ruta.match(/^\/alertas\/([^/]+)$/)
  if (mAl) {
    if (!exige('operador')) return
    const a = ALERTAS.find((x) => x.id === mAl[1])
    if (!a) return error(res, 404, 'NO_ENCONTRADO', 'Alerta no encontrada')
    if (req.method === 'GET') return json(res, 200, a)
    if (req.method === 'PATCH') {
      const b = await leerJson(req)
      if (!['nueva', 'revisada', 'descartada'].includes(b.estado)) return error(res, 400, 'DATOS_INVALIDOS', 'estado inválido')
      if (b.estado === 'nueva' && !exige('supervisor')) return
      Object.assign(a, { estado: b.estado, comentario: b.comentario ?? null, atendidaPor: usuario, atendidaEn: iso(ahora()) })
      auditar(usuario, 'cambio_estado_alerta', a.placaNormalizada, b.comentario, req)
      return json(res, 200, a)
    }
  }

  // --- auditoría
  if (ruta === '/auditoria/consultas') {
    if (!exige('admin')) return
    let items = AUDITORIA
    if (q('usuarioId')) items = items.filter((r) => r.usuario.id === q('usuarioId'))
    if (q('placa')) items = items.filter((r) => r.placaConsultada === normalizar(q('placa')))
    if (q('desde')) items = items.filter((r) => r.realizadaEn >= q('desde'))
    if (q('hasta')) items = items.filter((r) => r.realizadaEn <= q('hasta'))
    return json(res, 200, paginar(items, url))
  }

  // --- configuración
  if (ruta === '/configuracion/retencion' && req.method === 'GET') return json(res, 200, RETENCION)
  if (ruta === '/configuracion/retencion' && req.method === 'PUT') {
    if (!exige('admin')) return
    const b = await leerJson(req)
    RETENCION = { ...RETENCION, ...b, actualizadaEn: iso(ahora()), actualizadaPor: usuario }
    auditar(usuario, 'cambio_retencion', null, `Retención: ${b.diasDeteccionesSinAlerta} días sin alerta`, req)
    return json(res, 200, RETENCION)
  }

  return error(res, 404, 'NO_ENCONTRADO', `Ruta no definida en el contrato: ${req.method} ${ruta}`)
}).listen(PUERTO, () => {
  console.log(`Mock del contrato ANPR v0.2.0 en http://localhost:${PUERTO}${PREFIJO}`)
  console.log(`Usuarios: ${USUARIOS.map((u) => u.email).join(', ')} · contraseña: ${CLAVE}`)
})
