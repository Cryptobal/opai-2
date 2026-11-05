import { z } from "zod";

import { conflicto, defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { codigoVisible, esEditable, type EstadoRendicion } from "../domain";
import { contenidoDe, guardarViaje, type Contenido, type TipoRendicion } from "./contenido";
import { advertenciasSchema, cuerpoSchema, uuidSchema } from "./esquemas";
import { PERMISO_RENDIR } from "./permisos";
import { anotarPaso, datosItems } from "./registro";
import { actorId, ID_VISTA_PREVIA, rendicionDe, siguienteCodigo, validarAprobador, validarCentro } from "./util";
import { calculoSchema } from "./viaje";

const salidaSchema = z.object({
  id: uuidSchema,
  codigoVisible: z.string(),
  montoTotal: z.number().int(),
  advertencias: advertenciasSchema,
  kilometraje: calculoSchema.nullable().describe("Cálculo del viaje (solo rendiciones de kilometraje)."),
});

const salidaDe = (id: string, codigo: string, c: Contenido) => ({
  id, codigoVisible: codigo, montoTotal: c.montoTotal, advertencias: c.advertencias, kilometraje: c.viaje?.calculo.calculo ?? null,
});

export const rendicionesCrear = defineCapability({
  id: "rendiciones.rendiciones.crear",
  descripcion:
    "Crea una rendición en borrador: de compra, con sus gastos (proveedor, folio, monto y boleta), o de kilometraje, con los datos del viaje (el monto lo calcula el servidor con el método de la empresa y no se puede editar a mano). Lleva el centro de costo (una instalación activa o Administración) y, si se quiere, el aprobador. Avisa si una boleta parece repetida.",
  permiso: PERMISO_RENDIR,
  input: cuerpoSchema,
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    await validarCentro(ctx, input.instalacionId);
    if (input.aprobadorId) await validarAprobador(ctx, input.aprobadorId, yo);
    const tipo: TipoRendicion = input.tipo ?? "compra";
    const c = await contenidoDe(ctx, input, tipo);
    if (dryRun) return salidaDe(ID_VISTA_PREVIA, "REN-0", c);
    const r = await ctx.transaccion(async (tx) => {
      const codigo = await siguienteCodigo(tx, ctx.tenantId);
      const creada = await tx.rendicion.create({
        data: {
          tenantId: ctx.tenantId, codigo, solicitanteId: yo, aprobadorId: input.aprobadorId ?? null,
          centroCosto: input.centroCosto, instalacionId: input.instalacionId ?? null,
          descripcion: input.descripcion, montoTotal: c.montoTotal, tipo,
        },
      });
      await tx.rendicionItem.createMany({ data: datosItems(ctx.tenantId, creada.id, c.items) });
      if (c.viaje) await guardarViaje(tx, ctx.tenantId, creada.id, c.viaje.datos, c.viaje.calculo);
      await anotarPaso(ctx, tx, creada, { tipo: "creada", actorId: yo, hasta: "borrador" }, { montoTotal: c.montoTotal, tipo });
      return creada;
    });
    return salidaDe(r.id, codigoVisible(r.codigo), c);
  },
});

export const rendicionesActualizar = defineCapability({
  id: "rendiciones.rendiciones.actualizar",
  descripcion:
    "Cambia una rendición propia mientras sea un borrador o esté devuelta: reemplaza sus datos y la lista completa de gastos (o, en kilometraje, el viaje: el monto se recalcula en el servidor). Una rendición enviada o decidida no se edita ni cambia de tipo.",
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
    if (input.tipo && input.tipo !== r.tipo) throw reglaDeNegocio("Una rendición no cambia de tipo.");
    const c = await contenidoDe(ctx, input, r.tipo as TipoRendicion, r.id);
    if (dryRun) return salidaDe(r.id, codigoVisible(r.codigo), c);
    await ctx.transaccion(async (tx) => {
      const n = await tx.rendicion.updateMany({
        where: { id: r.id, estado: r.estado },
        data: {
          aprobadorId: input.aprobadorId ?? null, centroCosto: input.centroCosto,
          instalacionId: input.instalacionId ?? null, descripcion: input.descripcion, montoTotal: c.montoTotal,
        },
      });
      if (n.count !== 1) throw conflicto("La rendición cambió de estado mientras tanto.");
      await tx.rendicionItem.deleteMany({ where: { rendicionId: r.id } });
      await tx.rendicionItem.createMany({ data: datosItems(ctx.tenantId, r.id, c.items) });
      if (c.viaje) await guardarViaje(tx, ctx.tenantId, r.id, c.viaje.datos, c.viaje.calculo);
      await anotarPaso(ctx, tx, r, { tipo: "editada", actorId: yo, desde: r.estado, hasta: r.estado }, { montoTotal: c.montoTotal });
    });
    return salidaDe(r.id, codigoVisible(r.codigo), c);
  },
});
