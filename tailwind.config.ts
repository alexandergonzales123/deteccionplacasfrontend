import type { Config } from 'tailwindcss'

/**
 * Tokens del tema oscuro "centro de monitoreo" (según mockups Centinela ANPR).
 * Los colores semánticos se usan de forma consistente en toda la app:
 *  - ok      (verde): cámara activa, confianza >= 0.9, frescura "reciente"
 *  - warn    (ámbar): mantenimiento, confianza 0.8-0.89, frescura "probable"
 *  - danger  (rojo):  alerta, watchlist robado, alerta "nueva"
 *  - muted   (gris):  inactiva, frescura "antiguo", alerta "descartada"
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#080c14',
        sidebar: '#0a0f1a',
        panel: '#0d1420',
        panelHover: '#111a29',
        border: '#1a2536',
        primary: {
          DEFAULT: '#00b4d8',
          hover: '#0ea5e9',
          soft: 'rgba(0, 180, 216, 0.12)',
        },
        fg: '#e6edf3',
        fgMuted: '#8b98a9',
        fgDim: '#5c6878',
        ok: '#22c55e',
        warn: '#eab308',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      width: {
        sidebar: '230px',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
