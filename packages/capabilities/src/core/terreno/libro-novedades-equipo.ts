import { z } from "zod";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dispositivoActivo } from "./hechos-comun";
import { novedadSchema, vistaNovedad } from "./libro-novedades-comun";

/**
 * El libro de novedades de la instalación del equipo de terreno emparejado (CAR-77 parte 3): las últimas
 * novedades, de la más reciente a la más antigua, para la pantalla «Libro» de Terreno.
 */
export const libroNovedadesEquipo = defineCapability({
  id: "core.libro_novedades_equipo.listar",
  descripcion:
    "Lista las últimas novedades del libro de la instalación del equipo de terreno emparejado, de la más reciente a la más antigua, con su número NOV, gravedad, estado y hora.",
  permiso: null,
  // Interna: la lee el equipo emparejado sin sesión (su cookie de dispositivo es la credencial); un agente usa
  // core.libro_novedades.listar, con permiso y alcance.
  interna: true,
  input: z.object({
    dispositivoId: uuidSchema,
    limite: z.number().int().min(1).max(50).default(30),
    cursor: z.uuid().optional().describe("Valor de «siguiente» de la página anterior."),
  }),
  output: z.object({ items: z.array(novedadSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((n) => n.id),
  async handler(ctx, { dispositivoId, limite, cursor }) {
    const disp = await dispositivoActivo(ctx, dispositivoId);
    const filas = await ctx.db.libroNovedad.findMany({
      where: { instalacionId: disp.instalacionId },
      orderBy: [{ horaHecho: "desc" }, { id: "desc" }],
      take: limite + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const pagina = filas.slice(0, limite);
    return {
      items: pagina.map(vistaNovedad),
      siguiente: filas.length > limite ? (pagina.at(-1)?.id ?? null) : null,
    };
  },
});
