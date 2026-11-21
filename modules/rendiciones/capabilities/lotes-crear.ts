import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { validarSeleccion } from "../domain";
import { uuidSchema } from "./esquemas";
import { loteSalidaSchema } from "./lotes-esquemas";
import { anotarPasoLote, crearLoteBorrador, cuentasDeSolicitantes, exigirArmadoLote } from "./lotes-util";
import { PERMISO_PAGAR } from "./permisos";
import { actorId } from "./util";

export const lotesCrear = defineCapability({
  id: "rendiciones.lotes.crear",
  descripcion:
    "Arma un lote de pago con rendiciones aprobadas y no pagadas. El servidor suma el total en CLP entero; una rendición no puede estar en dos lotes activos y cada persona necesita datos bancarios completos en su ficha. Nadie arma un lote con una rendición propia. El lote nace en borrador y debe aprobarlo otra persona.",
  permiso: PERMISO_PAGAR,
  portales: ["erp"],
  input: z.object({ rendicionIds: z.array(uuidSchema).min(1).max(200).describe("Rendiciones aprobadas a pagar en este lote.") }),
  output: loteSalidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    const rends = await ctx.db.rendicion.findMany({
      where: { id: { in: input.rendicionIds } },
      select: { id: true, estado: true, montoTotal: true, solicitanteId: true, lotes: { where: { activo: true }, select: { loteId: true } } },
    });
    const cuentas = await cuentasDeSolicitantes(ctx, rends.map((r) => r.solicitanteId));
    const problemas = validarSeleccion(
      input.rendicionIds,
      rends.map((r) => ({ id: r.id, estado: r.estado, montoTotal: r.montoTotal, solicitanteId: r.solicitanteId, loteActivoId: r.lotes[0]?.loteId ?? null, conCuenta: cuentas.has(r.solicitanteId) })),
    );
    const total = exigirArmadoLote(problemas, yo, rends, "Nadie arma un lote de pago con una rendición propia.");
    return crearLoteBorrador(ctx, dryRun, total, rends.length, "Una de las rendiciones ya está en otro lote activo.", async (tx, codigo) => {
      const l = await tx.lotePago.create({
        data: {
          tenantId: ctx.tenantId, codigo, estado: "borrador", totalClp: total, cantidad: rends.length, creadoPorId: yo,
          items: {
            create: rends.map((r) => {
              const c = cuentas.get(r.solicitanteId)!;
              return { tenantId: ctx.tenantId, rendicionId: r.id, personaId: c.personaId, montoClp: r.montoTotal, cuentaVersion: c.version };
            }),
          },
        },
      });
      await anotarPasoLote(ctx, tx, l, { tipo: "creado", actorId: yo, hasta: "borrador" }, { totalClp: total, cantidad: rends.length });
      return l;
    });
  },
});
