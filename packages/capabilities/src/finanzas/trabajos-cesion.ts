import { z } from "zod";

import { defineTrabajo } from "../trabajos/registro";
import { adaptadorCesionDe } from "./adaptador-cesion";

export const trabajoConsultarCesionesRpetc = defineTrabajo({
  tipo: "finanzas.cesion.consultar_rpetc",
  descripcion: "Consulta el RPETC (Octava) para cesiones enviadas o aprobadas y actualiza su estado.",
  periodicidad: "horaria",
  payload: z.object({ hora: z.string() }),
  async handler(ctx) {
    const adaptador = await adaptadorCesionDe(ctx);
    if (!adaptador.disponible) return { omitido: true };
    const pendientes = await ctx.db.cesion.findMany({
      where: { estado: { in: ["enviada", "aprobada", "financiada"] } },
      take: 30,
    });
    let actualizadas = 0;
    let fallidas = 0;
    for (const c of pendientes) {
      if (!c.operacionExternaId) continue;
      try {
        const r = await adaptador.consultar(c.operacionExternaId);
        if (r.estado === c.estado) continue;
        await ctx.db.cesion.update({ where: { id: c.id }, data: { estado: r.estado } });
        actualizadas += 1;
      } catch {
        // Una consulta caída (Octava, token) no frena a las demás; se reintenta en la próxima hora.
        fallidas += 1;
      }
    }
    return { actualizadas, fallidas };
  },
});

export const trabajosCesion = [trabajoConsultarCesionesRpetc];
