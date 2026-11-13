/**
 * Fuente única de la piel Hilo en código (ADR-102 y ADR-105, CAR-334). Copia de los tokens del sistema
 * «OPAI 2.0 Design System · Hilo» de Claude Design (`project/tokens.json`). `tokens-hilo.test.ts`
 * compara `tokens.css` contra estos valores: si alguien cambia la piel en un solo lado, el test falla.
 * Si Hilo cambia en Claude Design, se actualiza aquí y en `tokens.css` en el mismo PR.
 */

/** Color Hilo → variable del DS que lo implementa, con su valor en claro y oscuro. */
export const COLORES_HILO = {
  bg: { variable: "--ds-bg", claro: "#fafaf9", oscuro: "#0a0a0b" },
  surface: { variable: "--ds-surface", claro: "#ffffff", oscuro: "#141416" },
  fill: { variable: "--ds-fill", claro: "#f0f0ee", oscuro: "#1d1d20" },
  line: { variable: "--ds-border", claro: "#e3e3e0", oscuro: "#29292d" },
  fg: { variable: "--ds-fg", claro: "#0d0d0e", oscuro: "#f4f4f5" },
  muted: { variable: "--ds-fg-muted", claro: "#5a5a60", oscuro: "#a1a1aa" },
  agente: { variable: "--ds-accent", claro: "#4a3fd8", oscuro: "#a9a4ff" },
  "agente-bg": { variable: "--ds-accent-muted", claro: "#eeedfc", oscuro: "#1d1b3a" },
  "agente-fg": { variable: "--ds-accent-fg", claro: "#ffffff", oscuro: "#0a0a0b" },
  ok: { variable: "--ds-success-fg", claro: "#166534", oscuro: "#4ade80" },
  "ok-bg": { variable: "--ds-success-muted", claro: "#e6f4ea", oscuro: "#10261a" },
  warn: { variable: "--ds-warning-fg", claro: "#92400e", oscuro: "#fbbf24" },
  "warn-bg": { variable: "--ds-warning-muted", claro: "#fbf0dc", oscuro: "#2a2009" },
  bad: { variable: "--ds-danger-fg", claro: "#b42318", oscuro: "#f87171" },
  "bad-bg": { variable: "--ds-danger-muted", claro: "#fbe9e7", oscuro: "#2c1313" },
} as const;

/** Radios Hilo en px (`tokens.json` › radius). */
export const RADIOS_HILO = {
  xs: 6, // esqueleto y hoja de papel
  sm: 8, // celdas de planilla, opciones de menú
  mono: 10, // monograma de 36 px
  md: 12, // controles
  lg: 14, // ícono de estado, búsqueda de lista
  xl: 16, // avisos, «qué cambia», columnas
  "2xl": 20, // diálogos
} as const;

/** Escala tipográfica Hilo: [tamaño, interlínea, peso] en px. */
export const TIPOGRAFIA_HILO = {
  "titulo-lienzo": [28, 34, 700],
  "titulo-cabecera": [18, 24, 600],
  "titulo-estado": [18, 26, 600],
  "sobre-linea": [12, 16, 600],
  "cuerpo-lg": [15, 22, 400],
  cuerpo: [14, 20, 400],
  control: [16, 22, 400],
  etiqueta: [13, 18, 500],
  nota: [12, 16, 500],
  mini: [11, 14, 600],
  indicador: [26, 30, 600],
  "cifra-celda": [13, 18, 500],
} as const;

/** Tamaños permitidos en la UI (px): los de la escala Hilo. Cualquier otro es un hallazgo. */
export const TAMANOS_TEXTO_HILO: readonly number[] = [
  ...new Set([...Object.values(TIPOGRAFIA_HILO).map(([t]) => t), 22, 24, 34, 26, 56, 44, 38]),
].sort((a, b) => a - b);

/** Alto mínimo de todo lo que se toca (botones, campos, filas, pestañas). */
export const TOUCH_HILO = 44;

/** Sombra de lo único que flota (menús, diálogos, barra). */
export const SOMBRA_HILO = {
  claro: "0 14px 40px -14px rgba(13, 13, 14, 0.28), 0 2px 6px rgba(13, 13, 14, 0.05)",
  oscuro: "0 14px 40px -14px rgba(0, 0, 0, 0.8), 0 0 0 1px #29292d",
} as const;
