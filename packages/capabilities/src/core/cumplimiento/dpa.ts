import { z } from "zod";

import { PERMISOS_CORE, sha256Hex } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { ajuste } from "../config";

/** Versión vigente del DPA que publica OPAI (ajuste de plataforma). "" = aún no publicada. */
export async function versionVigenteDpa(ctx: Contexto): Promise<string> {
  return (await ajuste<string>(ctx, "core", "cumplimiento_dpa_version")) || "";
}

/**
 * Referencia al texto aceptado: versión y hash SHA-256 del texto del DPA vigente. Prueba a qué
 * texto exacto aceptó el tenant; si OPAI cambia el texto de una versión, el hash deja de calzar.
 */
async function refDocumento(ctx: Contexto, version: string): Promise<string> {
  const texto = (await ajuste<string>(ctx, "core", "cumplimiento_dpa_texto")) || "";
  return `${version}:sha256:${await sha256Hex(texto)}`;
}

const aceptacionSchema = z.object({
  version: z.string(),
  aceptadoPor: z.string().nullable(),
  aceptadoEn: z.string(),
});

const estadoSchema = z.object({
  versionVigente: z.string().describe('Versión que publica OPAI; "" si aún no hay ninguna.'),
  publicada: z.boolean(),
  /** La vigente ya fue aceptada por el tenant. */
  aceptadaVigente: z.boolean(),
  /** Hay versión publicada y el tenant no la aceptó: se avisa al owner (no bloquea, §16.1). */
  pendiente: z.boolean(),
  ultima: aceptacionSchema.nullable(),
  historial: z.array(aceptacionSchema),
  dpo: z.object({
    nombre: z.string().nullable(),
    correo: z.string().nullable(),
    telefono: z.string().nullable(),
  }),
});

export const cumplimientoEstado = defineCapability({
  id: "core.cumplimiento.estado",
  descripcion:
    "Estado de cumplimiento de la Ley 21.719: versión vigente del acuerdo de tratamiento de datos (DPA), si la empresa la aceptó (con quién y cuándo) con su historial, y el contacto del delegado de protección de datos (DPO).",
  permiso: PERMISOS_CORE.cumplimientoRead,
  input: z.object({}),
  output: estadoSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const [version, filas, perfil] = await Promise.all([
      versionVigenteDpa(ctx),
      ctx.db.dpaAceptacion.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }),
    ]);
    const historial = filas.map((f) => ({
      version: f.version,
      aceptadoPor: f.aceptadoPor ?? null,
      aceptadoEn: f.createdAt.toISOString(),
    }));
    const publicada = version !== "";
    const aceptadaVigente = publicada && filas.some((f) => f.version === version);
    return {
      versionVigente: version,
      publicada,
      aceptadaVigente,
      pendiente: publicada && !aceptadaVigente,
      ultima: historial[0] ?? null,
      historial,
      dpo: {
        nombre: perfil?.dpoNombre ?? null,
        correo: perfil?.dpoCorreo ?? null,
        telefono: perfil?.dpoTelefono ?? null,
      },
    };
  },
});

export const cumplimientoDpaAceptar = defineCapability({
  id: "core.cumplimiento.dpa_aceptar",
  descripcion:
    "Registra que la empresa (responsable del tratamiento) acepta la versión vigente del acuerdo de tratamiento de datos (DPA) con OPAI. Queda append-only con quién y cuándo; volver a aceptar agrega una fila al historial.",
  permiso: PERMISOS_CORE.cumplimientoDpaAceptar,
  soloPersonas: true,
  input: z.object({
    version: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .optional()
      .describe("Versión a aceptar; por defecto, la vigente."),
  }),
  output: z.object({ version: z.string(), aceptadoEn: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const vigente = await versionVigenteDpa(ctx);
    if (!vigente) throw reglaDeNegocio("OPAI aún no publica una versión vigente del DPA.");
    if (input.version && input.version !== vigente)
      throw reglaDeNegocio(`La versión vigente del DPA es "${vigente}".`);
    const aceptadoPor = ctx.usuario ? `${ctx.usuario.nombre} <${ctx.usuario.email}>` : null;
    if (dryRun) return { version: vigente, aceptadoEn: new Date().toISOString() };
    const documentoRef = await refDocumento(ctx, vigente);
    const fila = await ctx.transaccion(async (tx) => {
      const f = await tx.dpaAceptacion.create({
        data: {
          tenantId: ctx.tenantId,
          version: vigente,
          aceptadoPorId: ctx.actor.tipo === "user" ? ctx.actor.id : null,
          aceptadoPor,
          documentoRef,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.cumplimiento.dpa_aceptado",
        entidadTipo: "dpa_aceptacion",
        entidadId: f.id,
        payload: { version: f.version },
      });
      return f;
    });
    return { version: fila.version, aceptadoEn: fila.createdAt.toISOString() };
  },
});
