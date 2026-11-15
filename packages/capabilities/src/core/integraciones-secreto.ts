import { z } from "zod";

import { enmascarar, motivoSecretoInvalido, sufijoParaGuardar } from "@opai/integrations";
import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { definicionVisible } from "../integraciones/resolver";
import { guardarSecretoTx } from "../integraciones/secretos";

/**
 * Guarda una credencial propia (CAR-195). Reemplazar una existente exige `reemplazar: true` (la vista previa dice si
 * reemplaza; en pantalla es el botón «Reemplazar»). La integración, el secreto y el descarte del token de Octava van
 * en una sola transacción: nunca queda un token viejo junto a la clave nueva.
 */
export const integracionesSetSecreto = defineCapability({
  id: "core.integraciones.set_secreto",
  // Credenciales y keys las gestionan personas: un agente no se crea keys ni cambia secretos.
  soloPersonas: true,
  descripcion:
    "Guarda una credencial propia de la empresa para una integración (cifrada; se muestra una sola vez enmascarada). Si ya hay una, reemplazarla exige confirmarlo con reemplazar. La auditoría nunca guarda el valor.",
  permiso: PERMISOS_CORE.integracionesManage,
  sensibles: ["valor"],
  input: z.object({
    proveedor: z.string(),
    nombre: z.string(),
    valor: z.string().trim().min(8).max(4000),
    reemplazar: z.boolean().default(false).describe("Confirma que se reemplaza la credencial guardada."),
  }),
  output: z.object({
    proveedor: z.string(),
    nombre: z.string(),
    mascara: z.string(),
    reemplaza: z.boolean().describe("Ya había una credencial con ese nombre: guardar la reemplaza."),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const def = await definicionVisible(ctx, input.proveedor);
    if (!def?.disponible) throw noEncontrado(`La integración "${input.proveedor}"`);
    if (!def.secretos.some((s) => s.nombre === input.nombre)) {
      throw reglaDeNegocio(`${def.nombre} no usa el secreto "${input.nombre}".`);
    }
    // Formas que el proveedor rechaza (key de SimpleAPI sin guiones, CAR-240): no se guardan, también en vista previa.
    const motivo = motivoSecretoInvalido(def.id, input.nombre, input.valor);
    if (motivo) throw reglaDeNegocio(motivo);
    const mascara = enmascarar(sufijoParaGuardar(input.nombre, input.valor));
    const previa = await ctx.db.secreto.count({
      where: { tenantId: ctx.tenantId, nombre: input.nombre, integracion: { proveedor: def.id } },
    });
    const salida = { proveedor: def.id, nombre: input.nombre, mascara, reemplaza: previa > 0 };
    if (dryRun) return salida;
    if (previa > 0 && !input.reemplazar) {
      throw reglaDeNegocio(`${def.nombre} ya tiene esa credencial guardada. Confirma que quieres reemplazarla.`);
    }
    await ctx.transaccion(async (tx) => {
      const fila = await tx.integracion.upsert({
        where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: def.id } },
        create: { tenantId: ctx.tenantId, proveedor: def.id, modalidad: "propia", estado: "configurada" },
        // Guardar un secreto propio pasa la integración a modalidad propia (si no, no se usaría).
        update: { modalidad: "propia", estado: "configurada", ultimoError: null },
      });
      await guardarSecretoTx(tx, ctx, fila.id, input.nombre, input.valor);
      // Con otras credenciales de Octava, el token guardado ya no vale: se descarta para revalidar.
      if (def.id === "dte_cesion") {
        await tx.secreto.deleteMany({
          where: { tenantId: ctx.tenantId, integracionId: fila.id, nombre: "token_sesion" },
        });
      }
    });
    return salida;
  },
});
