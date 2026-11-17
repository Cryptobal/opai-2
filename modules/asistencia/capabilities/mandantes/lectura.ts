import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

/** Marcas visibles para un mandante/EST según su acceso voluntario (solo lectura). */
export const mandanteMarcasListar = defineCapability({
  id: "asistencia.mandante_marcas.listar",
  descripcion: "Lista marcas de asistencia dentro del alcance del acceso de mandante o EST.",
  permiso: null,
  portales: ["cliente"],
  input: z.object({
    desde: z.string().optional(),
    hasta: z.string().optional(),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({
    items: z.array(z.object({
      id: z.string(), hora: z.string(), tipo: z.string(), instalacionId: z.string(),
    })),
    truncado: z.boolean(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    if (ctx.portal !== "cliente") throw reglaDeNegocio("Esta consulta es solo para el portal Cliente.");
    const correo = ctx.usuario?.email?.toLowerCase();
    if (!correo) throw reglaDeNegocio("No identificamos tu correo.");
    const accesos = await ctx.db.mandanteAcceso.findMany({
      where: { correo: correo.toLowerCase(), estado: "activo" },
      include: { instalaciones: true },
    });
    if (accesos.length === 0) return { items: [], truncado: false };
    const instIds = new Set<string>();
    for (const a of accesos) {
      if (a.todasInstalaciones) {
        const inst = await ctx.db.instalacion.findMany({ where: { cuentaId: a.cuentaId }, select: { id: true } });
        inst.forEach((x) => instIds.add(x.id));
      } else {
        a.instalaciones.forEach((x) => instIds.add(x.instalacionId));
      }
    }
    const marcas = await ctx.db.marca.findMany({
      where: {
        instalacionId: { in: [...instIds] },
        ...(i.desde || i.hasta
          ? { horaServidor: { ...(i.desde ? { gte: new Date(i.desde) } : {}), ...(i.hasta ? { lte: new Date(i.hasta) } : {}) } }
          : {}),
      },
      orderBy: { horaServidor: "desc" },
      take: i.limite + 1,
      select: { id: true, horaServidor: true, tipo: true, instalacionId: true },
    });
    const truncado = marcas.length > i.limite;
    return {
      truncado,
      items: (truncado ? marcas.slice(0, i.limite) : marcas).map((m) => ({
        id: m.id, hora: m.horaServidor.toISOString(), tipo: m.tipo, instalacionId: m.instalacionId,
      })),
    };
  },
});