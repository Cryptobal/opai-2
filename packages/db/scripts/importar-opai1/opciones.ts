// Contexto del tenant al calcular el plan: módulos vendibles por separado (Carlos, nov-2026).
// Las integraciones DTE (SimpleAPI, Octava, …) son por tenant en Configuración › Integraciones;
// el importador no las lee ni las exige: los tributarios viven en core.cuentas.

/** Mismos ids que Plataforma › Módulos / `ctx.modulosActivos` (sin incluir `core`). */
export type OpcionesPlan = {
  modulosActivos: readonly string[];
};

/** Sin módulos opcionales: solo núcleo (cuentas, contactos, instalaciones). Conservador para dry-run. */
export const OPCIONES_POR_DEFECTO: OpcionesPlan = { modulosActivos: [] };

export function modulosDelPlan(opciones: OpcionesPlan) {
  const activos = new Set(["core", ...opciones.modulosActivos]);
  return {
    comercial: activos.has("comercial"),
    finanzas: activos.has("finanzas"),
    cpq: activos.has("cpq"),
  };
}
