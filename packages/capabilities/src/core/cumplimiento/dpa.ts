import { z } from "zod";

import type { TenantTx } from "@opai/db";
import { PERMISOS_CORE, sha256Hex } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { ajuste } from "../config";

/** Versión vigente del DPA que publica OPAI (ajuste de plataforma). "" = aún no publicada. */
export async function versionVigenteDpa(ctx: Contexto, db: TenantTx = ctx.db): Promise<string> {
  return (await ajuste<string>(ctx, "core", "cumplimiento_dpa_version", db)) || "";
}

/**
 * Lee la versión vigente y su texto (ambos ajustes de plataforma que publica OPAI) usando `db`, para
 * poder hacerlo dentro de la transacción del INSERT de la aceptación (sin TOCTOU). Rechaza si no hay
 * versión publicada, si no es la versión pedida, o si el texto está vacío: no se acepta un DPA sin
 * texto. Devuelve la versión, el texto exacto y su referencia estable (`<version>:sha256:<hash>`).
 */
export async function leerDpaVigente(ctx: Contexto, db: TenantTx, versionPedida: string | undefined) {
  const version = await versionVigenteDpa(ctx, db);
  if (!version) throw reglaDeNegocio("OPAI aún no publica una versión vigente del DPA.");
  if (versionPedida && versionPedida !== version)
    throw reglaDeNegocio(`La versión vigente del DPA es "${version}".`);
  const texto = (await ajuste<string>(ctx, "core", "cumplimiento_dpa_texto", db)) || "";
  if (!texto.trim())
    throw reglaDeNegocio("OPAI aún no publica el texto de la versión vigente del DPA.");
  const sha256 = await sha256Hex(texto);
  return { version, texto, sha256, documentoRef: `${version}:sha256:${sha256}` };
}

/** Separa el "Nombre <correo>" guardado en aceptado_por en sus partes (para la ficha del historial). */
export function partirAceptadoPor(s: string | null): { nombre: string | null; correo: string | null } {
  if (!s) return { nombre: null, correo: null };
  const m = s.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { nombre: (m[1] ?? "").trim() || null, correo: (m[2] ?? "").trim() };
  return { nombre: s.trim() || null, correo: null };
}

const aceptacionSchema = z.object({
  version: z.string(),
  // Se conserva el string "Nombre <correo>" por compatibilidad; además va estructurado (C02/C05).
  aceptadoPor: z.string().nullable(),
  aceptadoPorNombre: z.string().nullable(),
  aceptadoPorCorreo: z.string().nullable(),
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
    const historial = filas.map((f) => {
      const { nombre, correo } = partirAceptadoPor(f.aceptadoPor ?? null);
      return {
        version: f.version,
        aceptadoPor: f.aceptadoPor ?? null,
        aceptadoPorNombre: nombre,
        aceptadoPorCorreo: correo,
        aceptadoEn: f.createdAt.toISOString(),
      };
    });
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
    // Aceptar el DPA es acto exclusivo del owner (§16.1). El permiso `cumplimientoDpaAceptar` ya lo
    // acota, pero un rol personalizado (#47) podría otorgarlo sin ser owner: se exige el rol además
    // del permiso, defensa en profundidad.
    if (ctx.rol !== "owner")
      throw prohibido("Aceptar el DPA es un acto exclusivo del propietario (owner) de la empresa.");
    const aceptadoPor = ctx.usuario ? `${ctx.usuario.nombre} <${ctx.usuario.email}>` : null;
    if (dryRun) {
      const { version } = await leerDpaVigente(ctx, ctx.db, input.version);
      return { version, aceptadoEn: new Date().toISOString() };
    }
    const fila = await ctx.transaccion(async (tx) => {
      // Lee versión y texto DENTRO de la transacción del INSERT: lo que se guarda es exactamente lo
      // vigente al escribir, sin ventana TOCTOU con una edición del ajuste de plataforma.
      const { version, texto, documentoRef } = await leerDpaVigente(ctx, tx, input.version);
      const f = await tx.dpaAceptacion.create({
        data: {
          tenantId: ctx.tenantId,
          version,
          aceptadoPorId: ctx.actor.tipo === "user" ? ctx.actor.id : null,
          aceptadoPor,
          documentoRef,
          documentoTexto: texto,
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
