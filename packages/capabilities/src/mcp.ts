import { restriccion } from "./autorizacion";
import { executeCapability } from "./execute";
import { listarCapacidades } from "./registry";
import type { Capacidad, Contexto, Resultado } from "./types";

/** Herramienta MCP derivada de una capacidad (ADR-004). La de vista previa ejecuta con dryRun. */
export type HerramientaMcp = {
  nombre: string;
  descripcion: string;
  capacidad: Capacidad;
  dryRun: boolean;
};

/** `core.users.invite` → `core_users_invite`. */
export const nombreHerramienta = (id: string): string => id.replace(/\./g, "_");

/** Si la capacidad es visible para el contexto: no interna, restricciones (ADR-033) y permiso. */
export function esVisible(ctx: Contexto, c: Capacidad): boolean {
  if (c.interna) return false;
  if (restriccion(ctx, c)) return false;
  return c.permiso === null || ctx.autorizar(c.permiso);
}

function describir(c: Capacidad, preview: boolean): string {
  if (preview) return `VISTA PREVIA (no guarda nada) de ${c.id}: ${c.descripcion}`;
  if (c.efecto === "lectura") return c.descripcion;
  const aviso = c.efecto === "irreversible" ? "IRREVERSIBLE. " : "Escribe datos. ";
  return `${aviso}${c.descripcion} Usa antes preview_${nombreHerramienta(c.id)} para revisar el efecto.`;
}

/**
 * Herramientas MCP para el contexto (API key): una por capacidad visible y, si escribe,
 * además `preview_<id>`. El input schema es el Zod de la capacidad.
 */
export function herramientasMcp(ctx: Contexto): HerramientaMcp[] {
  return listarCapacidades()
    .filter((c) => esVisible(ctx, c))
    .flatMap((c) => {
      const real = {
        nombre: nombreHerramienta(c.id),
        descripcion: describir(c, false),
        capacidad: c,
        dryRun: false,
      };
      if (c.efecto === "lectura") return [real];
      return [
        real,
        {
          nombre: `preview_${real.nombre}`,
          descripcion: describir(c, true),
          capacidad: c,
          dryRun: true,
        },
      ];
    });
}

/** Ejecuta la herramienta y devuelve el `Resultado` de la capacidad (se envía como JSON). */
export function ejecutarHerramienta(
  ctx: Contexto,
  h: HerramientaMcp,
  args: unknown,
): Promise<Resultado> {
  return executeCapability(ctx, h.capacidad.id, args, { dryRun: h.dryRun });
}
