// SeguimientoCierre de un borrador del cierre: proforma enviada, OK u observación del cliente y OC/HES
// (BRIEF-33 · CAR-167). No emite ni envía nada al cliente o al SII: registra el estado.
import { z } from "zod";

import { aplicarAccionCierre, etapaCierre, ESTADOS_SEGUIMIENTO_CIERRE, ETAPAS_CIERRE, type AccionCierre } from "@opai/domain";

import { defineCapability } from "../define";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_VENTAS } from "./ventas-comun";
import { aSeguimiento } from "./cierre-esquemas";

const texto = z.string().trim().max(60).nullable().optional();
const entrada = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("registrar_oc_hes"), ordenCompra: texto, hes: texto, requiereOcHes: z.boolean().optional() }),
  z.object({ accion: z.literal("marcar_enviada") }),
  z.object({ accion: z.literal("marcar_ok") }),
  z.object({ accion: z.literal("observar"), observacion: z.string().trim().min(1).max(500) }),
  z.object({ accion: z.literal("reabrir") }),
]);

export const cierreActualizar = defineCapability({
  id: "finanzas.cierre.actualizar",
  descripcion:
    "Registra el avance del cierre de un borrador: OC/HES del cliente, proforma enviada (o recordada), OK del cliente, observación del cliente o reapertura. No emite el documento ni envía correos.",
  permiso: PERMISO_VENTAS,
  input: z.object({ documentoId: z.string().uuid(), cambio: entrada }),
  output: z.object({
    documentoId: z.string(),
    etapa: z.enum(ETAPAS_CIERRE),
    estado: z.enum(ESTADOS_SEGUIMIENTO_CIERRE),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({
      where: { id: input.documentoId },
      select: { id: true, estadoDte: true, seguimientoCierre: true },
    });
    if (!doc) throw noEncontrado("El documento");
    if (doc.estadoDte !== "borrador") throw reglaDeNegocio("El documento ya fue emitido: el cierre ya terminó.");
    const previo = doc.seguimientoCierre;
    const r = aplicarAccionCierre(aSeguimiento(previo), input.cambio as AccionCierre);
    if (!r.ok) throw reglaDeNegocio(r.motivo);
    const s = r.seguimiento;
    const salida = { documentoId: doc.id, etapa: etapaCierre(doc.estadoDte, s), estado: s.estado };
    if (dryRun) return salida;
    const ahora = new Date();
    const marcas = {
      ...(input.cambio.accion === "marcar_enviada"
        ? previo?.estado === "enviada" ? { recordadaEn: ahora } : { enviadaEn: ahora }
        : {}),
      ...(input.cambio.accion === "marcar_ok" ? { okEn: ahora } : {}),
      ...(input.cambio.accion === "observar" ? { observadaEn: ahora } : {}),
    };
    const datos = {
      estado: s.estado,
      requiereOcHes: s.requiereOcHes,
      ordenCompra: s.ordenCompra,
      hes: s.hes,
      observacion: s.observacion,
      actualizadoPorId: ctx.usuario?.id ?? null,
      ...marcas,
    };
    await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.cierre.actualizado",
        entidadTipo: "documento_emitido",
        payload: () => ({ accion: input.cambio.accion, estado: s.estado }),
      },
      async (tx) => {
        await tx.ventasCierreSeguimiento.upsert({
          where: { documentoId: doc.id },
          create: { tenantId: ctx.tenantId, documentoId: doc.id, ...datos },
          update: datos,
        });
        return { id: doc.id };
      },
    );
    return salida;
  },
});
