import { z } from "zod";

import { conflicto, defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { codigoVisible, esEditable, totalRendicion, type EstadoRendicion } from "../domain";
import { advertenciasSchema, cuerpoSchema, uuidSchema } from "./esquemas";
import { PERMISO_RENDIR } from "./permisos";
import { anotarPaso, datosItems } from "./registro";
import { actorId, avisosDuplicados, ID_VISTA_PREVIA, rendicionDe, siguienteCodigo, validarAprobador, validarCentro, validarItems } from "./util";

const salidaSchema = z.object({
  id: uuidSchema,
  codigoVisible: z.string(),
  montoTotal: z.number().int(),
  advertencias: advertenciasSchema,
});

export const rendicionesCrear = defineCapability({
  id: "rendiciones.rendiciones.crear",
  descripcion:
    "Crea una rendición de gastos de compra en borrador, con sus gastos (proveedor, folio, monto y boleta), el centro de costo (una instalación activa o Administración) y, si se quiere, el aprobador. Avisa si una boleta parece repetida.",
  permiso: PERMISO_RENDIR,
  input: cuerpoSchema,
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    await validarCentro(ctx, input.instalacionId);
    if (input.aprobadorId) await validarAprobador(ctx, input.aprobadorId, yo);
    await validarItems(ctx, input.items);
    const advertencias = await avisosDuplicados(ctx, input.items);
    const montoTotal = totalRendicion(input.items);
    if (dryRun) return { id: ID_VISTA_PREVIA, codigoVisible: "REN-0", montoTotal, advertencias };
    const r = await ctx.transaccion(async (tx) => {
      const codigo = await siguienteCodigo(tx, ctx.tenantId);
      const creada = await tx.rendicion.create({
        data: {
          tenantId: ctx.tenantId, codigo, solicitanteId: yo, aprobadorId: input.aprobadorId ?? null,
          centroCosto: input.centroCosto, instalacionId: input.instalacionId ?? null,
          descripcion: input.descripcion, montoTotal,
        },
      });
      await tx.rendicionItem.createMany({ data: datosItems(ctx.tenantId, creada.id, input.items) });
      await anotarPaso(ctx, tx, creada, { tipo: "creada", actorId: yo, hasta: "borrador" }, { montoTotal });
      return creada;
    });
    return { id: r.id, codigoVisible: codigoVisible(r.codigo), montoTotal, advertencias };
  },
});

export const rendicionesActualizar = defineCapability({
  id: "rendiciones.rendiciones.actualizar",
  descripcion:
    "Cambia una rendición propia mientras sea un borrador o esté devuelta: reemplaza sus datos y la lista completa de gastos. Una rendición enviada o decidida no se edita.",
  permiso: PERMISO_RENDIR,
  input: cuerpoSchema.safeExtend({ id: uuidSchema }),
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    const r = await rendicionDe(ctx, input.id);
    if (r.solicitanteId !== yo) throw prohibido("Solo quien rinde edita su rendición.");
    if (!esEditable(r.estado as EstadoRendicion)) throw reglaDeNegocio(`Una rendición «${r.estado}» no se edita.`);
    await validarCentro(ctx, input.instalacionId);
    if (input.aprobadorId) await validarAprobador(ctx, input.aprobadorId, yo);
    await validarItems(ctx, input.items);
    const advertencias = await avisosDuplicados(ctx, input.items, r.id);
    const montoTotal = totalRendicion(input.items);
    if (dryRun) return { id: r.id, codigoVisible: codigoVisible(r.codigo), montoTotal, advertencias };
    await ctx.transaccion(async (tx) => {
      const n = await tx.rendicion.updateMany({
        where: { id: r.id, estado: r.estado },
        data: {
          aprobadorId: input.aprobadorId ?? null, centroCosto: input.centroCosto,
          instalacionId: input.instalacionId ?? null, descripcion: input.descripcion, montoTotal,
        },
      });
      if (n.count !== 1) throw conflicto("La rendición cambió de estado mientras tanto.");
      await tx.rendicionItem.deleteMany({ where: { rendicionId: r.id } });
      await tx.rendicionItem.createMany({ data: datosItems(ctx.tenantId, r.id, input.items) });
      await anotarPaso(ctx, tx, r, { tipo: "editada", actorId: yo, desde: r.estado, hasta: r.estado }, { montoTotal });
    });
    return { id: r.id, codigoVisible: codigoVisible(r.codigo), montoTotal, advertencias };
  },
});
