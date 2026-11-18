import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { assertEntradaListaEnAlcance } from "./listas-alcance";
import { PERMISO_LISTAS } from "./comun";

export const listasQuitar = defineCapability({
  id: "acceso.listas.quitar",
  descripcion:
    "Quita una entrada de la lista autorizada o bloqueada de una instalación. Si la entrada ya se usó en algún ingreso no se borra: queda vencida desde ahora, para conservar el historial.",
  permiso: PERMISO_LISTAS,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: uuidSchema, accion: z.enum(["eliminada", "vencida"]) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const e = await ctx.db.entradaLista.findFirst({
      where: { id },
      include: { registros: { select: { id: true }, take: 1 } },
    });
    if (!e) throw noEncontrado("La entrada de lista");
    await assertEntradaListaEnAlcance(ctx, e);
    const usada = e.registros.length > 0;
    if (!dryRun) {
      if (usada)
        await ctx.db.entradaLista.update({ where: { id }, data: { vigenteHasta: new Date() } });
      else await ctx.db.entradaLista.delete({ where: { id } });
    }
    return { id, accion: usada ? ("vencida" as const) : ("eliminada" as const) };
  },
});