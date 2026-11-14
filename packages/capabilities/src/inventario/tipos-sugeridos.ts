import { nombreNormalizado, tiposSugeridos } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../define";
import { PERMISOS_INVENTARIO } from "./comun";

/**
 * R6: agrega los tipos típicos del rubro que la empresa todavía no tiene (por nombre). Nunca cambia
 * los existentes, así que volver a correrla no hace nada.
 */
export const tiposCargarSugeridos = defineCapability({
  id: "inventario.tipos.cargar_sugeridos",
  descripcion:
    "Agrega de una vez los tipos de inventario típicos del rubro de la empresa (por ejemplo teléfono, radio y las prendas del uniforme) que todavía no existan. No cambia los tipos que ya están.",
  permiso: PERMISOS_INVENTARIO.tiposManage,
  input: z.object({}),
  output: z.object({ agregados: z.array(z.string()), yaExistian: z.array(z.string()) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, _input, { dryRun }) {
    const [tenant, existentes] = await Promise.all([
      ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { vertical: true } }),
      ctx.db.inventarioTipo.findMany({ select: { nombreNormalizado: true } }),
    ]);
    const hay = new Set(existentes.map((e) => e.nombreNormalizado));
    const sugeridos = tiposSugeridos(tenant?.vertical ?? "");
    const nuevos = sugeridos.filter((s) => !hay.has(nombreNormalizado(s.nombre)));
    const resultado = {
      agregados: nuevos.map((s) => s.nombre),
      yaExistian: sugeridos.filter((s) => hay.has(nombreNormalizado(s.nombre))).map((s) => s.nombre),
    };
    if (dryRun || nuevos.length === 0) return resultado;
    await ctx.transaccion(async (tx) => {
      const creados = await tx.inventarioTipo.createManyAndReturn({
        data: nuevos.map((s) => ({ ...s, nombreNormalizado: nombreNormalizado(s.nombre), tenantId: ctx.tenantId })),
        skipDuplicates: true,
        select: { id: true, nombre: true, categoria: true },
      });
      for (const t of creados) {
        await ctx.eventos.emitir(tx, {
          tipo: "inventario.tipo.creado",
          entidadTipo: "inventario_tipo",
          entidadId: t.id,
          payload: { nombre: t.nombre, categoria: t.categoria, sugerido: true },
        });
      }
    });
    return resultado;
  },
});
