import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { codigoVerificacion, marcaIntegra } from "../domain";
import { registroDeFila } from "./registro-fila";

/**
 * Verificación pública por hash (diseño export-reporteria-dt-v2/03): el enlace del comprobante abre una
 * página sin sesión. Es interna (la ejecuta la ruta pública con el slug de la empresa y el hash como
 * credencial) y devuelve solo lo mínimo: nunca el nombre, el RUT ni la ubicación del trabajador.
 */
export const marcasVerificar = defineCapability({
  id: "asistencia.marcas.verificar",
  descripcion:
    "Verifica públicamente una marca de asistencia por su hash: recalcula el hash del registro y su enlace con la marca anterior, y muestra solo lo mínimo del comprobante (tipo, fecha y hora del servidor, empresa, establecimiento y código de verificación).",
  permiso: null,
  interna: true,
  input: z.object({ hash: z.string().regex(/^[0-9a-f]{64}$/) }),
  output: z.object({
    valida: z.boolean(),
    integra: z.boolean().optional(),
    tipo: z.string().optional(),
    horaServidor: z.string().optional(),
    empresa: z.string().optional(),
    establecimiento: z.string().nullable().optional(),
    codigo: z.string().optional(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    const f = await ctx.db.marca.findUnique({ where: { hash: i.hash } });
    if (!f) return { valida: false };
    const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } });
    const registro = registroDeFila(f);
    return {
      valida: true,
      integra: await marcaIntegra(f.hash, f.hashAnterior, registro),
      tipo: f.tipo,
      horaServidor: f.horaServidor.toISOString(),
      empresa: t?.nombre ?? "",
      establecimiento: registro.snapshot.establecimiento,
      codigo: await codigoVerificacion(f.hash),
    };
  },
});
