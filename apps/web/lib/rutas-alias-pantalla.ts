/**
 * Rutas que solo redirigen o repiten la misma pantalla de forma declarada (CAR-580).
 * Si dos rutas comparten componente y no están aquí ni en `PANTALLAS_PARIDAD_PORTAL`, el test falla.
 */
export const RUTAS_ALIAS_PANTALLA: Readonly<Record<string, string>> = {
  "/configuracion/api-keys": "/configuracion/agentes",
  "/configuracion/preferencias": "/mi-cuenta/preferencias",
  "/finanzas/plan-de-cuentas": "/configuracion/modulo/finanzas?seccion=plan-cuentas",
  "/personas/nueva": "/personas?nueva=1",
  "/cuentas/nueva": "/cuentas?nueva=1",
  "/cargos/nuevo": "/cargos?nuevo=1",
  "/cargos/nueva": "/cargos?nuevo=1",
  "/vencimientos": "/personas/vencimientos",
  "/personas/cargos": "/cargos",
  "/personas/cargos-y-sueldos": "/cargos",
  "/cargos/personas": "/personas",
  "/cargos/vencimientos": "/personas/vencimientos",
  "/nomina": "/remuneraciones",
};

/** Misma pantalla montada en varios portales (ERP, supervisor, etc.). */
export const PANTALLAS_PARIDAD_PORTAL: Readonly<
  { patron: RegExp; motivo: string }[]
> = [
  {
    patron: /^\/rendiciones(\/|$)/,
    motivo: "Rendiciones en ERP y portal supervisor comparten componentes.",
  },
  {
    patron: /^\/supervisor\/rendiciones(\/|$)/,
    motivo: "Rendiciones en ERP y portal supervisor comparten componentes.",
  },
  { patron: /\/:ruta\.\.\.$/, motivo: "Catch-all de 404 por portal." },
];

export function rutaCanonica(alias: string): string {
  return RUTAS_ALIAS_PANTALLA[alias] ?? alias;
}