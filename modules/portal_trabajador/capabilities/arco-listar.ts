import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { personaPropia } from "./persona-propia";

const PORTALES = ["trabajador"] as const;

const filaSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  estado: z.string(),
  recibidaEn: z.string(),
  plazoEn: z.string().nullable(),
  detalle: z.string().nullable(),
});

export const arcoListar = defineCapability({
  id: "portal_trabajador.arco.listar",
  descripcion:
    "Lista las solicitudes de derechos del titular (ARCO+) de la propia persona del trabajador, con tipo, estado, fecha de recepción y plazo de respuesta (Ley 21.719). Solo lectura auditada.",
  permiso: null,
  portales: PORTALES,
  auditarLectura: (s) => s.items.map((x) => x.id),
  input: z.object({}),
  output: z.object({ items: z.array(filaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const p = await personaPropia(ctx);
    const filas = await ctx.db.solicitudArco.findMany({
      where: { titularTipo: "persona", titularId: p.id },
      orderBy: { recibidaEn: "desc" },
      take: 50,
    });
    return {
      items: filas.map((s) => ({
        id: s.id,
        tipo: s.tipo,
        estado: s.estado,
        recibidaEn: s.recibidaEn.toISOString(),
        plazoEn: s.plazoEn?.toISOString() ?? null,
        detalle: s.detalle ?? null,
      })),
    };
  },
});
