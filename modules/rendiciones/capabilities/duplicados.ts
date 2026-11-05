import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { uuidSchema } from "./esquemas";
import { PERMISO_RENDIR, PORTALES_RENDIR } from "./permisos";
import { actorId, duplicadosDe } from "./util";

export const rendicionesDuplicados = defineCapability({
  id: "rendiciones.duplicados.consultar",
  descripcion:
    "Avisa, sin guardar nada, si una boleta o factura (mismo proveedor, folio y monto) ya fue rendida en otra rendición vigente. Solo mira las rendiciones que quien consulta puede ver; no bloquea.",
  permiso: PERMISO_RENDIR,
  portales: PORTALES_RENDIR,
  input: z.object({
    gastos: z
      .array(
        z.object({
          proveedor: z.string().trim().min(1).max(120),
          folio: z.string().trim().min(1).max(40),
          monto: z.number().int().min(1).max(50_000_000),
        }),
      )
      .min(1)
      .max(50),
    excluirRendicionId: uuidSchema
      .optional()
      .describe("La rendición que se está corrigiendo, para no avisar contra sí misma."),
  }),
  output: z.object({
    repetidos: z.array(
      z.object({
        gasto: z.number().int().describe("Posición (desde 1) del gasto repetido."),
        codigoVisible: z.string(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    actorId(ctx);
    const items = input.gastos.map((g) => ({ ...g, fecha: "", descripcion: "" }));
    return { repetidos: await duplicadosDe(ctx, items, input.excluirRendicionId) };
  },
});
