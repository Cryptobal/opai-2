import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido, rechazoSensible, reglaDeNegocio } from "../../errores";
import { aFecha, dia, escribirConEvento } from "./comun";
import { DIA_MS, entrada, referencia } from "./estructuras-ref";
import { ocultarMontos } from "./estructuras-acceso";
import { estructuraSchema, vistaEstructura } from "./estructuras-vista";
import { bloquearCapa, bloquearCargo } from "./estructuras-bloqueo";
import { impactoCambio } from "./estructuras-impacto";

export { estructurasAnular } from "./estructuras-anular";

export const estructurasCreate = defineCapability({
  id: "core.estructuras.create",
  descripcion:
    "Crea una versión completa de sueldo de instalación, puesto o RUT, sin herencia. Cierra la anterior el día previo y rechaza solapes. La vista previa incluye impacto conocido y personas pendientes del vínculo del PR 3. Cargo se conserva hasta su retiro en PR 2.",
  permiso: PERMISOS_CORE.estructurasManage,
  input: entrada,
  output: estructuraSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (ctx.rol !== "owner" && ctx.rol !== "admin")
      throw prohibido("Solo owner y admin pueden cambiar capas de sueldo.");
    return ctx.transaccion(async (tx) => {
      ctx = { ...ctx, db: tx, transaccion: (fn) => fn(tx) };
      const ref = await referencia(ctx, input);
      await bloquearCapa(tx, ctx.tenantId, input.nivel, ref.id);
      if (input.nivel === "cargo" && !ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)) {
        // Bloquea la fila para serializar la comprobación con cambios de sensibilidad.
        await bloquearCargo(tx, ctx.tenantId, ref.id);
        if (await ocultarMontos(ctx, { nivel: "cargo", ...ref.refs }, false))
          throw rechazoSensible(
            "No puedes crear versiones de este cargo. Sus montos son sensibles. Pide a un owner o admin el permiso para ver sueldos sensibles.",
          );
      }
      // Sin lectura sensible se rechaza toda versión de estas capas: podría borrar bonos ocultos.
      if (input.nivel !== "cargo" && !ctx.autorizar(PERMISOS_CORE.estructurasReadSensible))
        throw rechazoSensible("No tienes permiso para crear versiones de esta capa de sueldo.");
      const desde = aFecha(input.vigenteDesde);
      const vigentes = await ctx.db.estructuraSueldo.findMany({
        where: { nivel: input.nivel, [ref.campo]: ref.id, estado: "vigente" },
      });
      const posterior = vigentes.find((v) => v.vigenteDesde >= desde);
      if (posterior) {
        throw reglaDeNegocio(
          `Ya hay una versión vigente desde ${dia(posterior.vigenteDesde)}: anúlala o usa una fecha posterior.`,
        );
      }
      const abierta = vigentes.find((v) => !v.vigenteHasta || v.vigenteHasta >= desde);
      const items = input.items;
      const data = {
        nivel: input.nivel,
        ...ref.refs,
        ...ref.conceptos,
        gratificacionMonto: input.gratificacionMonto ?? null,
        motivo: input.motivo ?? null,
        vigenteDesde: desde,
        estado: "vigente",
      };
      const impacto = await impactoCambio(
        ctx,
        input.nivel,
        ref.id,
        input.vigenteDesde,
        abierta,
        data,
        items,
      );
      if (dryRun) {
        // Sin fila persistida todavía: `ocultarMontos` no tiene id que auditar (nada se reveló aún).
        return {
          ...vistaEstructura({ ...data, id: "" }, items, await ocultarMontos(ctx, data)),
          impacto,
        };
      }
      const e = await escribirConEvento(
        ctx,
        {
          tipo: "core.estructura.creada",
          entidadTipo: "estructura",
          payload: () => ({
            nivel: input.nivel,
            ref: ref.id,
            desde: input.vigenteDesde,
            cierra: abierta?.id ?? null,
          }),
        },
        async (tx) => {
          if (abierta) {
            await tx.estructuraSueldo.update({
              where: { id: abierta.id },
              data: { vigenteHasta: new Date(desde.getTime() - DIA_MS) },
            });
          }
          const nueva = await tx.estructuraSueldo.create({
            data: { ...data, tenantId: ctx.tenantId, creadoPor: ctx.usuario?.id ?? null },
          });
          for (const [orden, i] of items.entries()) {
            await tx.estructuraItem.create({
              data: {
                ...i,
                monto: i.monto ?? null,
                porcentaje: i.porcentaje ?? null,
                orden,
                tenantId: ctx.tenantId,
                estructuraId: nueva.id,
              },
            });
          }
          return nueva;
        },
      );
      // Recién con `e.id` (la fila ya persistida) `ocultarMontos` puede auditar la revelación: la
      // respuesta de creación entrega los mismos montos sensibles que un `get`, así que queda trazada
      // igual (quién, cuándo, qué).
      return { ...vistaEstructura(e, items, await ocultarMontos(ctx, e)), impacto };
    });
  },
});
