import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { prohibido } from "../errores";
import { accesoDelActor } from "../portal-cliente/comun";
import { configDeCuenta } from "../portal-cliente/config-datos";
import type { Contexto } from "../types";
import { inputPaginaAcceso } from "./pagina-alcance";
import { registrosListar } from "./registros";

/**
 * El contacto de cliente como actor de Accesos (CAR-481, R12, ADR-022): su alcance son las instalaciones de su
 * cuenta que puede ver, así las capacidades del ERP responden NOT_FOUND fuera de ellas. No hereda ningún permiso
 * fino (patente completa, gestionar registros): lo que puede hacer lo decide la capacidad del portal. Sin la
 * sección «Accesos» en su portal, FORBIDDEN.
 */
export async function contextoCliente(ctx: Contexto): Promise<{ ctx: Contexto; cuentaId: string }> {
  const a = await accesoDelActor(ctx);
  const { config } = await configDeCuenta(ctx, a.cuentaId);
  if (!config.seccionesVisibles.includes("accesos"))
    throw prohibido("Tu portal no tiene la sección Accesos.");
  return {
    ctx: { ...ctx, alcance: { instalaciones: a.instalacionIds }, autorizar: () => false },
    cuentaId: a.cuentaId,
  };
}

export const portalRegistrosListar = defineCapability({
  id: "acceso.portal_registros.listar",
  descripcion:
    "Portal Cliente: entradas y salidas de las instalaciones de tu cuenta, de la más reciente a la más antigua; con «en sitio» solo quienes siguen dentro. El documento va enmascarado y la patente no se muestra.",
  // Sin permiso de módulo, como el resto del Portal Cliente: lo decide `accesoDelActor` (FAIL-CLOSED, ADR-022).
  permiso: null,
  input: z.object({
    instalacionId: uuidSchema.optional(),
    soloEnSitio: z.boolean().default(false),
    ...inputPaginaAcceso,
  }),
  output: registrosListar.output,
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  auditarLectura: (salida) => salida.items.map((r) => r.id),
  async handler(ctx, input) {
    const { ctx: c } = await contextoCliente(ctx);
    return registrosListar.handler(c, input, { dryRun: false });
  },
});
