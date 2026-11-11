// Otorgar y revocar el consentimiento de un cliente para ser referencia (CAR-138 PR 7). Append-only:
// cada acción agrega una fila; nada se edita ni se borra. Quién puede otorgar es configurable por
// permiso (decisión de Carlos pendiente); revocar es la dirección segura y basta gestionar cuentas.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { aFecha, diaSchema, escribirConEvento, textoOpcional } from "./comun";
import { cuentaDe } from "./cuentas-acceso";
import {
  bloquearCuenta,
  cuentaDeReferencia,
  EVIDENCIAS_REFERENCIA,
  hoyReferencias,
  referenciaSchema,
  vistaReferencia,
} from "./referencias-vista";

export function responsable(ctx: Contexto): string {
  const id = ctx.usuario?.id;
  if (!id)
    throw reglaDeNegocio("Se necesita una persona responsable para registrar el consentimiento.");
  return id;
}

async function contactoDeCuenta(ctx: Contexto, contactoId: string, cuentaId: string) {
  const [c, v] = await Promise.all([
    ctx.db.contacto.findFirst({
      where: { id: contactoId, archivadoEn: null, anonimizadoEn: null },
    }),
    ctx.db.contactoCuenta.findFirst({ where: { contactoId, cuentaId } }),
  ]);
  if (!c || (c.cuentaId !== cuentaId && !v)) throw noEncontrado("El contacto de la cuenta");
}

export const cuentasReferenciasOtorgar = defineCapability({
  id: "core.cuentas_referencias.otorgar",
  descripcion:
    "Registra que un cliente dio su consentimiento explícito para ser referencia comercial en propuestas y documentos: fecha, evidencia, quién lo dio, hasta cuándo y qué se puede mostrar (su nombre o anonimizado, una descripción y una cita). Sin este registro el cliente nunca aparece como referencia.",
  permiso: PERMISOS_CORE.cuentasReferenciasAutorizar,
  // Registrar un consentimiento es un acto de una persona: ninguna API key lo hace, ni con autonomía
  // «directo» (que se salta la aprobación). Los agentes pueden listar y revocar (ADR-087).
  soloPersonas: true,
  portales: ["erp"],
  input: z.object({
    cuentaId: uuidSchema,
    confirmoConsentimientoExplicito: z
      .literal(true)
      .describe(
        "Confirmo que el cliente autorizó expresamente ser referencia y que hay evidencia.",
      ),
    otorgadoEn: diaSchema.describe("Fecha en que el cliente dio el consentimiento (aaaa-mm-dd)."),
    vigenteHasta: diaSchema
      .nullable()
      .optional()
      .describe("Hasta cuándo vale; sin fecha, hasta revocar."),
    evidencia: z.enum(EVIDENCIAS_REFERENCIA),
    evidenciaDetalle: z
      .string()
      .trim()
      .min(3)
      .max(300)
      .describe("Dónde consta (p. ej. «correo del 3-nov»)."),
    contactoId: uuidSchema.optional().describe("Contacto del cliente que lo autorizó."),
    mostrarNombre: z
      .boolean()
      .default(false)
      .describe("Si autorizó mostrar su nombre; si no, sale anonimizado."),
    descripcion: textoOpcional(400),
    cita: textoOpcional(400),
  }),
  output: referenciaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const registradoPorId = responsable(ctx);
    const c = await cuentaDe(ctx, input.cuentaId);
    if (c.archivadaEn) throw reglaDeNegocio("La cuenta está archivada.");
    if (c.estado === "prospecto")
      throw reglaDeNegocio("Un prospecto no puede ser referencia: aún no es cliente.");
    const hoy = hoyReferencias();
    if (input.otorgadoEn > hoy)
      throw reglaDeNegocio("La fecha del consentimiento no puede ser futura.");
    if (input.vigenteHasta && input.vigenteHasta < hoy) {
      throw reglaDeNegocio("La vigencia ya terminó: no hay consentimiento que registrar.");
    }
    if (input.contactoId) await contactoDeCuenta(ctx, input.contactoId, c.id);
    const data = {
      tenantId: ctx.tenantId,
      cuentaId: c.id,
      estado: "otorgado",
      mostrarNombre: input.mostrarNombre,
      descripcion: input.descripcion ?? null,
      cita: input.cita ?? null,
      otorgadoEn: aFecha(input.otorgadoEn),
      vigenteHasta: input.vigenteHasta ? aFecha(input.vigenteHasta) : null,
      contactoId: input.contactoId ?? null,
      evidencia: input.evidencia,
      evidenciaDetalle: input.evidenciaDetalle,
      motivo: null,
      registradoPorId,
    };
    if (dryRun) return vistaReferencia({ ...data, id: "", createdAt: new Date(), cuenta: c }, hoy);
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.cuenta.referencia_otorgada",
        entidadTipo: "cuenta_referencia",
        payload: () => ({
          cuentaId: c.id,
          mostrarNombre: data.mostrarNombre,
          vigenteHasta: input.vigenteHasta ?? null,
        }),
      },
      async (tx) => {
        await bloquearCuenta(tx, ctx.tenantId, c.id);
        return tx.cuentaReferencia.create({ data, include: { cuenta: cuentaDeReferencia } });
      },
    );
    return vistaReferencia(r, hoy);
  },
});
