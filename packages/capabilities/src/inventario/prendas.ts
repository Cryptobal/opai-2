// Ropa ligada al uniforme (CAR-504; referente BambooHR / Rippling): un tipo de ropa apunta a una prenda del kit
// de la empresa (CAR-408) y, al entregar a una persona, se propone la talla que tiene en su ficha.
import { normalizarTalla } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { prendasDeLaEmpresa } from "../core/maestros/uniforme-prendas";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { PERMISOS_INVENTARIO } from "./comun";
import { exigirDestino } from "./entregas-comun";

/** Error si la prenda no es del kit del uniforme de la empresa. */
export async function exigirPrendaDelKit(ctx: Contexto, clave: string) {
  if (!(await prendasDeLaEmpresa(ctx)).some((p) => p.clave === clave))
    throw reglaDeNegocio(`La prenda «${clave}» no está en el uniforme de la empresa.`);
}

export const prendasList = defineCapability({
  id: "inventario.prendas.list",
  descripcion:
    "Lista las prendas del uniforme de la empresa (las propias o las de su rubro), para ligar un tipo de ropa del inventario a una de ellas.",
  permiso: PERMISOS_INVENTARIO.read,
  input: z.object({
    cursor: z.string().optional().describe("El `siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(50).default(50),
  }),
  output: z.object({
    items: z.array(z.object({ clave: z.string(), nombre: z.string() })),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { cursor, limite }) {
    const kit = await prendasDeLaEmpresa(ctx);
    const desde = cursor ? kit.findIndex((p) => p.clave === cursor) + 1 : 0;
    const pagina = kit.slice(desde, desde + limite);
    return { items: pagina, siguiente: desde + limite < kit.length ? (pagina.at(-1)?.clave ?? null) : null };
  },
});

export const tallaDePersona = defineCapability({
  id: "inventario.entregas.talla_persona",
  descripcion:
    "Propone la talla con que se entrega una prenda de ropa a una persona: la que tiene en su ficha para la prenda del uniforme ligada a ese tipo. Nula si no hay. La lectura queda auditada.",
  permiso: PERMISOS_INVENTARIO.gestionar,
  // Revela un dato de la ficha de la persona: se audita qué persona (sin la talla).
  auditarLectura: (s) => [s.personaId],
  input: z.object({ tipoId: uuidSchema, personaId: uuidSchema }),
  output: z.object({ personaId: z.string(), talla: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { tipoId, personaId }) {
    await exigirDestino(ctx, { personaId });
    const tipo = await ctx.db.inventarioTipo.findFirst({ where: { id: tipoId }, select: { categoria: true, prendaClave: true } });
    if (!tipo || tipo.categoria !== "ropa") throw noEncontrado("El tipo de ropa");
    if (!tipo.prendaClave) return { personaId, talla: null };
    const fila = await ctx.db.personaTalla.findFirst({ where: { personaId, prenda: tipo.prendaClave }, select: { talla: true } });
    return { personaId, talla: fila?.talla.trim() ? normalizarTalla(fila.talla) : null };
  },
});
