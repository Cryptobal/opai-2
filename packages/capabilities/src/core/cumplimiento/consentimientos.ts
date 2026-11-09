import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { actorLegible, cargarTitular, titularSchema } from "./comunes";

/** Titular ya resuelto (tipo y id); evita repetir la unión literal en los helpers. */
type Suscriptor = { tipo: string; id: string };

const consentimientoVista = z.object({
  id: z.string(),
  estado: z.string(),
  proposito: z.string(),
  versionAviso: z.string(),
  creadoEn: z.string(),
});

const propositoSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .describe('Fin accesorio, p. ej. "comunicaciones_comerciales" (§16.2).');

/** Última fila (estado vigente) de un consentimiento por titular y propósito, dentro de la tx.
 *  Ordena por `id` (uuid7 = orden real de creación), no por `created_at` (hora de inicio de la
 *  transacción), por el mismo motivo que los hechos de incidentes. */
const vigente = (tx: TenantTx, t: Suscriptor, proposito: string) =>
  tx.consentimiento.findFirst({
    where: { titularTipo: t.tipo, titularId: t.id, proposito },
    orderBy: { id: "desc" },
  });

/** Anota un hecho (otorgar/revocar) y emite su evento en la misma transacción (outbox, ADR-029). */
export async function anotar(
  ctx: Contexto,
  tx: TenantTx,
  t: Suscriptor,
  datos: { proposito: string; versionAviso: string; estado: string; nota: string | null },
) {
  const f = await tx.consentimiento.create({
    data: {
      tenantId: ctx.tenantId,
      titularTipo: t.tipo,
      titularId: t.id,
      proposito: datos.proposito,
      versionAviso: datos.versionAviso,
      estado: datos.estado,
      origen: "interno",
      nota: datos.nota,
      registradoPor: actorLegible(ctx),
    },
  });
  await ctx.eventos.emitir(tx, {
    tipo:
      datos.estado === "otorgado"
        ? "core.cumplimiento.consentimiento_otorgado"
        : "core.cumplimiento.consentimiento_revocado",
    entidadTipo: "consentimiento",
    entidadId: f.id,
    payload: { titular: { tipo: t.tipo, id: t.id }, proposito: datos.proposito },
  });
  return f;
}

const salida = (f: {
  id: string;
  estado: string;
  proposito: string;
  versionAviso: string;
  createdAt: Date;
}) => ({
  id: f.id,
  estado: f.estado,
  proposito: f.proposito,
  versionAviso: f.versionAviso,
  creadoEn: f.createdAt.toISOString(),
});

export const consentimientoRegistrar = defineCapability({
  id: "core.cumplimiento.consentimiento_registrar",
  descripcion:
    "Registra que un titular (persona o contacto) otorga su consentimiento para un fin accesorio, p. ej. comunicaciones comerciales (Ley 21.719). Queda append-only, versionado y auditado; no aplica a la relación laboral ni a obligaciones legales.",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({
    titular: titularSchema,
    proposito: propositoSchema,
    versionAviso: z.string().trim().min(1).max(40).describe("Versión del aviso de privacidad."),
    nota: z.string().trim().max(500).nullable().optional(),
  }),
  output: consentimientoVista,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const titular = await cargarTitular(ctx, input.titular);
    if (dryRun)
      return {
        id: "",
        estado: "otorgado",
        proposito: input.proposito,
        versionAviso: input.versionAviso,
        creadoEn: new Date().toISOString(),
      };
    const f = await ctx.transaccion((tx) =>
      anotar(ctx, tx, titular, {
        proposito: input.proposito,
        versionAviso: input.versionAviso,
        estado: "otorgado",
        nota: input.nota ?? null,
      }),
    );
    return salida(f);
  },
});

export const consentimientoRevocar = defineCapability({
  id: "core.cumplimiento.consentimiento_revocar",
  descripcion:
    "Registra que un titular revoca un consentimiento otorgado antes para un fin accesorio (Ley 21.719). Es una fila nueva (append-only): no edita la anterior. Los tratamientos cuya única base era ese consentimiento cesan.",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({
    titular: titularSchema,
    proposito: propositoSchema,
    nota: z.string().trim().max(500).nullable().optional(),
  }),
  output: consentimientoVista,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const titular = await cargarTitular(ctx, input.titular);
    // Chequeo y escritura en la misma transacción (sin TOCTOU): solo se revoca lo vigente otorgado.
    return ctx.transaccion(async (tx) => {
      const ultima = await vigente(tx, titular, input.proposito);
      if (!ultima || ultima.estado !== "otorgado")
        throw reglaDeNegocio("No hay un consentimiento vigente que revocar para ese fin.");
      if (dryRun)
        return {
          id: "",
          estado: "revocado",
          proposito: input.proposito,
          versionAviso: ultima.versionAviso,
          creadoEn: new Date().toISOString(),
        };
      return salida(
        await anotar(ctx, tx, titular, {
          proposito: input.proposito,
          versionAviso: ultima.versionAviso,
          estado: "revocado",
          nota: input.nota ?? null,
        }),
      );
    });
  },
});
