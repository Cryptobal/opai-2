import { z } from "zod";

import {
  credencialDePlataforma,
  definicionIntegracion,
  type ProveedorIaId,
} from "@opai/integrations";
import { PERMISOS_CORE, PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { externo } from "../externo";
import { correoDe, iaDe } from "../integraciones/adaptadores";
import { probarEmisionDte } from "./integraciones-probar-dte";
import { probarGeo } from "./integraciones-probar-geo";
import { probarOctava } from "./integraciones-probar-octava";

export const integracionesProbar = defineCapability({
  id: "core.integraciones.probar",
  descripcion:
    "Prueba la conexión de una integración con su credencial vigente (correo, geolocalización, IA, cesión con Octava o la API key de emisión DTE en SimpleAPI) y guarda el resultado en su estado.",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({ proveedor: z.string() }),
  // Ante un error, `mensaje` incluye el texto que devolvió el proveedor (saneado): dato externo.
  output: z.object({ ok: z.boolean(), mensaje: externo(z.string()), latenciaMs: z.number() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const def = definicionIntegracion(input.proveedor);
    if (!def?.disponible) throw noEncontrado(`La integración "${input.proveedor}"`);
    // Slack no tiene prueba genérica: su estado lo da la conexión (core.slack.estado, ADR-093).
    if (def.id === "slack")
      throw reglaDeNegocio("El estado de Slack se ve en Configuración › Integraciones › Slack.");
    if (dryRun)
      return { ok: true, mensaje: "Vista previa: no se llamó al proveedor.", latenciaMs: 0 };
    const inicio = Date.now();
    let ok = true;
    let mensaje = "Conexión correcta.";
    try {
      if (def.categoria === "geo") {
        await probarGeo(ctx);
      } else if (def.categoria === "ia") {
        // Probar registra estado y evento abajo; evita un segundo aviso desde el resolvedor.
        const ia = await iaDe(ctx, "economica", "core", def.id as ProveedorIaId, { avisar: false });
        if (!ia) throw reglaDeNegocio("Sin credencial de IA disponible.");
        // Holgura para modelos con razonamiento activo por defecto (Haiku 5.5 y posteriores): con
        // 5 tokens el razonamiento agota el tope antes del texto. Un error del proveedor llega con
        // su mensaje saneado (sin la key) y se muestra tal cual en pantalla.
        await ia.completar({ prompt: "Responde solo: ok", maxTokens: 256 });
        mensaje = `Conexión correcta (${ia.proveedor}, ${ia.modelo}).`;
      } else if (def.id === "dte_cesion") {
        mensaje = await probarOctava(ctx);
      } else if (def.id === "dte_emision") {
        // Prueba real de la key contra SimpleAPI (CAR-263); antes caía en la prueba de correo.
        mensaje = await probarEmisionDte(ctx);
      } else {
        const correo = await correoDe(ctx);
        if (!correo.remitente)
          throw reglaDeNegocio("Sin credencial de correo: los correos se escriben en el log.");
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
