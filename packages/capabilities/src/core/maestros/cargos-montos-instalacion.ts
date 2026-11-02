import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { hoy } from "./comun";
import { ocultarMontos } from "./estructuras-acceso";

const filaSchema = z.object({
  instalacionId: z.string(),
  instalacionNombre: z.string(),
  puestos: z.number().int(),
  sueldoBase: z.number().nullable(),
  sensible: z.boolean(),
});

export const cargosMontosPorInstalacion = defineCapability({
  auditarLectura: (s) => s.items.map((i) => i.instalacionId),
  id: "core.cargos.montos_por_instalacion",
  descripcion:
    "Lista, por instalación, los montos de sueldo resueltos en los puestos de un cargo (solo lectura). Respeta cargos sensibles y el permiso de montos sensibles.",
  permiso: PERMISOS_CORE.estructurasRead,
  input: z.object({ id: uuidSchema, fecha: z.string().optional() }),
  output: z.object({ cargoId: z.string(), items: z.array(filaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const fecha = input.fecha ?? hoy();
    const cargo = await ctx.db.cargo.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } });
    if (!cargo) throw noEncontrado("El cargo");
    const puestos = await ctx.db.puesto.findMany({
      where: { cargoId: cargo.id, tenantId: ctx.tenantId, estado: "activo" },
      include: { instalacion: { select: { id: true, nombre: true } } },
    });
    const porInst = new Map<
      string,
      { nombre: string; puestos: number; sueldo: number | null; sensible: boolean }
    >();
    for (const p of puestos) {
      const key = p.instalacionId;
      const agg = porInst.get(key) ?? {
        nombre: p.instalacion.nombre,
        puestos: 0,
        sueldo: null as number | null,
        sensible: false,
      };
      agg.puestos += 1;
      const est = await ctx.db.estructuraSueldo.findFirst({
        where: {
          tenantId: ctx.tenantId,
          nivel: "puesto",
          puestoId: p.id,
          estado: "vigente",
          vigenteDesde: { lte: new Date(`${fecha}T00:00:00.000Z`) },
          OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: new Date(`${fecha}T00:00:00.000Z`) } }],
        },
      });
      if (est) {
        const oculto =
          cargo.sueldoSensible ||
          (await ocultarMontos(ctx, { ...est, cargoId: cargo.id }, false));
        if (oculto) agg.sensible = true;
        else if (est.sueldoBase != null) agg.sueldo = est.sueldoBase;
      }
      porInst.set(key, agg);
    }
    const items = [...porInst.entries()].map(([instalacionId, v]) => ({
      instalacionId,
      instalacionNombre: v.nombre,
      puestos: v.puestos,
      sueldoBase: v.sensible ? null : v.sueldo,
      sensible: v.sensible,
    }));
    return { cargoId: cargo.id, items };
  },
});
