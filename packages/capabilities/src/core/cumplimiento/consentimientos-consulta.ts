import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { cargarTitular, titularSchema } from "./comunes";

const hechoSchema = z.object({
  id: z.string(),
  proposito: z.string(),
  estado: z.string(),
  versionAviso: z.string(),
  origen: z.string(),
  creadoEn: z.string(),
});

export const consentimientosListar = defineCapability({
  id: "core.cumplimiento.consentimientos_listar",
  descripcion:
    "Lista el historial de consentimientos de un titular (otorgados y revocados) por fin accesorio, con el estado vigente de cada fin (Ley 21.719). El alcance se aplica en la consulta: solo del tenant actual.",
  permiso: PERMISOS_CORE.cumplimientoRead,
  input: z.object({ titular: titularSchema }),
  output: z.object({
    titular: z.object({ tipo: z.string(), id: z.string(), nombre: z.string() }),
    vigentes: z.array(z.object({ proposito: z.string(), estado: z.string(), desde: z.string() })),
    historial: z.array(hechoSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    // cargarTitular valida que el titular sea del tenant (RLS), no se confía solo en el id.
    const titular = await cargarTitular(ctx, input.titular);
    const filas = await ctx.db.consentimiento.findMany({
      where: { titularTipo: titular.tipo, titularId: titular.id },
      // Orden por `id` (uuid7 = orden real de creación), no por `created_at` (hora de inicio de
      // la transacción): la primera fila por propósito es el estado vigente, igual que en incidentes.
      orderBy: { id: "desc" },
      take: 200,
    });
    // La última fila por propósito es el estado vigente (append-only).
    const vigentes = new Map<string, { proposito: string; estado: string; desde: string }>();
    for (const f of filas)
      if (!vigentes.has(f.proposito))
        vigentes.set(f.proposito, {
          proposito: f.proposito,
          estado: f.estado,
          desde: f.createdAt.toISOString(),
        });
    return {
      titular: { tipo: titular.tipo, id: titular.id, nombre: titular.nombre },
      vigentes: [...vigentes.values()],
      historial: filas.map((f) => ({
        id: f.id,
        proposito: f.proposito,
        estado: f.estado,
        versionAviso: f.versionAviso,
        origen: f.origen,
        creadoEn: f.createdAt.toISOString(),
      })),
    };
  },
});
