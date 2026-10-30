import { z } from "zod";

import { enmascararRun } from "@opai/domain";

import { defineCapability } from "../../define";
import { PERMISO_FIRMAS_READ, hashToken } from "./comun-flujo";

/**
 * Verificación de un documento firmado (firma.md R6, §10, CA3): a partir del token del comprobante,
 * dice si corresponde a una firma completada de este tenant y quién firmó; si se envía la huella del
 * archivo, dice además si coincide con H2 (el PDF sellado). No revela nada de otro tenant: el token
 * resuelve la solicitud por el hash de su comprobante dentro del tenant actual, nunca por el cuerpo.
 */
export const firmasVerificar = defineCapability({
  id: "core.firmas.verificar",
  descripcion:
    "Verifica si un archivo corresponde a un documento firmado y por quién, a partir del token del comprobante y, opcionalmente, la huella SHA-256 del archivo (firma.md R6, CA3).",
  permiso: PERMISO_FIRMAS_READ,
  portales: ["erp", "cliente", "supervisor"],
  input: z.object({
    token: z.string().trim().min(10).max(120),
    sha256: z
      .string()
      .regex(/^[0-9a-f]{64}$/, "La huella debe ser SHA-256 en hexadecimal.")
      .optional(),
  }),
  sensibles: ["token"],
  output: z.object({
    encontrada: z.boolean(),
    solicitudId: z.string().nullable(),
    estado: z.string().nullable(),
    clase: z.string().nullable(),
    nivel: z.string().nullable(),
    sha256: z.string().nullable(),
    sha256Firmado: z.string().nullable(),
    coincide: z.boolean().nullable(),
    completadaEn: z.string().nullable(),
    firmantes: z.array(
      z.object({ nombre: z.string(), run: z.string().nullable(), firmadoEn: z.string().nullable() }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (r) => (r.solicitudId ? [r.solicitudId] : []),
  async handler(ctx, input) {
    const vacio = {
      encontrada: false,
      solicitudId: null,
      estado: null,
      clase: null,
      nivel: null,
      sha256: null,
      sha256Firmado: null,
      coincide: null,
      completadaEn: null,
      firmantes: [],
    };
    const s = await ctx.db.solicitudFirma.findFirst({
      where: { tenantId: ctx.tenantId, comprobanteTokenHash: hashToken(input.token) },
      include: { firmantes: { where: { rol: "firma" } } },
    });
    if (!s) return vacio;
    return {
      encontrada: true,
      solicitudId: s.id,
      estado: s.estado,
      clase: s.clase,
      nivel: s.nivel,
      sha256: s.sha256,
      sha256Firmado: s.sha256Firmado,
      coincide: input.sha256 ? input.sha256 === s.sha256Firmado : null,
      completadaEn: s.completadaEn ? s.completadaEn.toISOString() : null,
      firmantes: s.firmantes.map((f) => ({
        nombre: f.nombre,
        run: enmascararRun(f.run),
        firmadoEn: f.firmadoEn ? f.firmadoEn.toISOString() : null,
      })),
    };
  },
});
