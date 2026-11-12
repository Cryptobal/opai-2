import { z } from "zod";

import { abrirCertificadoPfx } from "@opai/integrations";
import { enmascararRun, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { definicionVisible } from "../integraciones/resolver";
import { guardarSecretoTx } from "../integraciones/secretos";
import { integracionSchema, vistaIntegracion } from "./integraciones-vista";

const inputSchema = z.object({
  proveedor: z.literal("dte_emision"),
  /** Contenido del .pfx/.p12 en base64 (sin data: URL). */
  archivoBase64: z.string().min(16).max(520_000),
  claveCertificado: z.string().min(1).max(256),
});

export const integracionesGuardarCertificadoDte = defineCapability({
  id: "core.integraciones.guardar_certificado_dte",
  soloPersonas: true,
  descripcion:
    "Sube el certificado digital .pfx/.p12 de emisión DTE: valida la clave, guarda el archivo y la clave cifrados (KEK) y deja metadatos públicos (titular, RUT enmascarado, vencimiento). La auditoría no registra el archivo ni la clave.",
  permiso: PERMISOS_CORE.integracionesManage,
  sensibles: ["archivoBase64", "claveCertificado"],
  input: inputSchema,
  output: integracionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const def = await definicionVisible(ctx, input.proveedor);
    if (!def?.disponible) throw noEncontrado(`La integración "${input.proveedor}"`);
    // La clave se guarda recortada si así abre el .pfx (CAR-240): un espacio o salto al copiarla no viaja a SimpleAPI.
    let parsed: ReturnType<typeof abrirCertificadoPfx>;
    try {
      parsed = abrirCertificadoPfx(input.archivoBase64, input.claveCertificado);
    } catch (e) {
      throw reglaDeNegocio(e instanceof Error ? e.message : "Certificado inválido.");
    }
    // Como `extractRut` de 1.0 (CAR-240): sin RUT del titular, SimpleAPI no puede firmar con este certificado.
    if (!parsed.meta.rutTitular) {
      throw reglaDeNegocio(
        "No se pudo leer el RUT del titular del certificado. Usa el certificado de firma electrónica de la persona autorizada ante el SII.",
      );
    }
    const certificadoMeta = {
      titular: parsed.meta.titular,
      rutTitular: parsed.meta.rutTitular ? enmascararRun(parsed.meta.rutTitular) : null,
      venceEn: parsed.meta.venceEn,
    };
    const filaPrev = await ctx.db.integracion.findUnique({
      where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: def.id } },
    });
    const configBase =
      filaPrev?.config && typeof filaPrev.config === "object"
        ? (filaPrev.config as Record<string, unknown>)
        : {};
    const configNueva = def.config.parse({ ...configBase, certificadoMeta });
    if (dryRun) {
      return {
        ...(await vistaIntegracion(ctx, def.id)),
        modalidad: "propia",
        config: configNueva,
      };
    }
    await ctx.transaccion(async (tx) => {
      const fila = await tx.integracion.upsert({
        where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: def.id } },
        create: {
          tenantId: ctx.tenantId,
          proveedor: def.id,
          modalidad: "propia",
          estado: "configurada",
          config: JSON.parse(JSON.stringify(configNueva)),
        },
        update: {
          modalidad: "propia",
          estado: "configurada",
          ultimoError: null,
          config: JSON.parse(JSON.stringify(configNueva)),
          actualizadoPor: ctx.usuario?.id ?? null,
        },
      });
      await guardarSecretoTx(tx, ctx, fila.id, "certificado_pfx", parsed.base64);
      await guardarSecretoTx(tx, ctx, fila.id, "certificado_clave", parsed.clave);
      await ctx.eventos.emitir(tx, {
        tipo: "core.integracion.certificado_dte",
        entidadTipo: "integracion",
        entidadId: def.id,
        payload: { accion: "reemplazar", certificadoMeta },
      });
    });
    return vistaIntegracion(ctx, def.id);
  },
});
