import { ajuste } from "../core/config/valores";
import { prohibido } from "../errores";
import type { Contexto } from "../types";
import { type AccesoResuelto, accesoDelActor } from "./comun";
import { configDeCuenta } from "./config-datos";

/** Secciones de cuenta que viven en otro módulo: el módulo que las alimenta y el ajuste con que la empresa las apaga. */
const SECCIONES = {
  facturas: { modulo: "finanzas", clave: "seccion_facturas", nombre: "las facturas" },
  tickets: { modulo: "tickets", clave: "seccion_tickets", nombre: "los tickets" },
} as const;
export type SeccionOpcional = keyof typeof SECCIONES;

/** ¿La cuenta ve la sección? Su módulo activo, la empresa no la apagó y la cuenta la encendió (CAR-518, CAR-519). */
export async function seccionOpcionalActiva(
  ctx: Contexto,
  visibles: readonly string[],
  s: SeccionOpcional,
): Promise<boolean> {
  const { modulo, clave } = SECCIONES[s];
  if (!ctx.modulosActivos.includes(modulo) || !visibles.includes(s)) return false;
  return (await ajuste<boolean>(ctx, "portal_cliente", clave)) !== false;
}

/** Acceso del contacto con la sección encendida, o FORBIDDEN. */
export async function accesoConSeccion(ctx: Contexto, s: SeccionOpcional): Promise<AccesoResuelto> {
  const a = await accesoDelActor(ctx);
  const { config } = await configDeCuenta(ctx, a.cuentaId);
  if (!(await seccionOpcionalActiva(ctx, config.seccionesVisibles, s)))
    throw prohibido(`Tu empresa de seguridad no muestra ${SECCIONES[s].nombre} en el portal.`);
  return a;
}
