import { z } from "zod";

import {
  credencialDePlataforma,
  definicionIntegracion,
  type ProveedorIaId,
} from "@opai/integrations";
import { PERMISOS_CORE, PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { correoDe, geoDe, iaDe } from "../integraciones/adaptadores";

async function geoDisponible(ctx: Parameters<typeof geoDe>[0]) {
  const geo = await geoDe(ctx);
  if (!geo) throw new Error("La geolocalización no está disponible en este entorno.");
  return geo;
}

export const integracionesProbar = defineCapability({
  id: "core.integraciones.probar",
  descripcion:
    "Prueba la conexión de una integración con su credencial vigente (correo, geolocalización o IA) y guarda el resultado en su estado.",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({ proveedor: z.string() }),
  output: z.object({ ok: z.boolean(), mensaje: z.string(), latenciaMs: z.number() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const def = definicionIntegracion(input.proveedor);
    if (!def?.disponible) throw noEncontrado(`La integración "${input.proveedor}"`);
    if (dryRun)
      return { ok: true, mensaje: "Vista previa: no se llamó al proveedor.", latenciaMs: 0 };
    const inicio = Date.now();
    let ok = true;
    let mensaje = "Conexión correcta.";
    try {
      if (def.categoria === "geo") {
        if (!(await (await geoDisponible(ctx)).geocodificar("Plaza de Armas, Santiago")))
          throw new Error("Sin resultados.");
      } else if (def.categoria === "ia") {
        // Se prueba exactamente el proveedor pedido, no el primero disponible.
        const ia = await iaDe(ctx, "economica", "core", def.id as ProveedorIaId);
        if (!ia) throw new Error("Sin credencial de IA disponible.");
        await ia.completar({ prompt: "Responde solo: ok", maxTokens: 5 });
        mensaje = `Conexión correcta (${ia.proveedor}, ${ia.modelo}).`;
      } else {
        const correo = await correoDe(ctx);
        if (!correo.remitente)
          throw new Error("Sin credencial de correo: los correos se escriben en el log.");
      }
    } catch (e) {
      ok = false;
      mensaje = e instanceof Error ? e.message : String(e);
    }
    const estado = {
      estado: ok ? "configurada" : "error",
      ultimoTestEn: new Date(),
      ultimoError: ok ? null : mensaje,
    };
    await ctx.transaccion(async (tx) => {
      await tx.integracion.upsert({
        where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: def.id } },
        create: { tenantId: ctx.tenantId, proveedor: def.id, ...estado },
        update: estado,
      });
      // Comunicaciones avisa a quien tenga la regla de core.integracion.error (ADR-020).
      if (!ok) {
        await ctx.eventos.emitir(tx, {
          tipo: "core.integracion.error",
          entidadTipo: "integracion",
          entidadId: def.id,
          payload: { nombre: def.nombre, error: mensaje.slice(0, 300) },
        });
      }
    });
    return { ok, mensaje, latenciaMs: Date.now() - inicio };
  },
});

export const platformIntegracionesEstado = defineCapability({
  id: "platform.integraciones.estado",
  descripcion:
    "Plataforma: qué credenciales de plataforma existen en este entorno (sí/no por integración). Nunca devuelve valores.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({}),
  output: z.array(z.object({ proveedor: z.string(), credencialPlataforma: z.boolean() })),
  efecto: "lectura",
  dryRun: false,
  handler: async () =>
    ["resend", "google_maps", "ia_anthropic", "ia_openai", "ia_google"].map((p) => ({
      proveedor: p,
      credencialPlataforma: credencialDePlataforma(p) !== null,
    })),
});
