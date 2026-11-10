// Revocar el consentimiento de referencia (CAR-138 PR 7): una fila nueva; nada se edita ni se borra.
// Es la dirección segura: basta gestionar cuentas.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "./comun";
import { cuentaDe } from "./cuentas-acceso";
import { responsable } from "./referencias-escritura";
import {
  bloquearCuenta,
  cuentaDeReferencia,
  hoyReferencias,
  referenciaSchema,
  ultimaEnTx,
  ultimasReferencias,
  vistaReferencia,
} from "./referencias-vista";

const sinConsentimiento = () =>
  reglaDeNegocio("La cuenta no tiene un consentimiento de referencia que revocar.");

export const cuentasReferenciasRevocar = defineCapability({
  id: "core.cuentas_referencias.revocar",
  descripcion:
    "Revoca el consentimiento de un cliente para ser referencia comercial, con el motivo. Desde ese momento el cliente deja de aparecer en propuestas y documentos nuevos; lo ya enviado no cambia.",
  permiso: PERMISOS_CORE.cuentasManage,
  portales: ["erp"],
  input: z.object({ cuentaId: uuidSchema, motivo: z.string().trim().min(3).max(300) }),
  output: referenciaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const registradoPorId = responsable(ctx);
    const c = await cuentaDe(ctx, input.cuentaId);
    const [ultima] = await ultimasReferencias(ctx, { id: c.id });
    if (ultima?.estado !== "otorgado") throw sinConsentimiento();
    const hoy = hoyReferencias();
    const data = {
      tenantId: ctx.tenantId,
      cuentaId: c.id,
      estado: "revocado",
      mostrarNombre: false,
      descripcion: null,
      cita: null,
      otorgadoEn: null,
      vigenteHasta: null,
      contactoId: null,
      evidencia: null,
      evidenciaDetalle: null,
      motivo: input.motivo,
      registradoPorId,
    };
    if (dryRun) return vistaReferencia({ ...data, id: "", createdAt: new Date(), cuenta: c }, hoy);
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.cuenta.referencia_revocada",
        entidadTipo: "cuenta_referencia",
        payload: () => ({ cuentaId: c.id }),
      },
      async (tx) => {
        // Se vuelve a mirar la última fila con la cuenta bloqueada: si entre tanto otra escritura la
        // cambió, la revocación decide sobre el estado real.
        await bloquearCuenta(tx, ctx.tenantId, c.id);
        if ((await ultimaEnTx(tx, c.id))?.estado !== "otorgado") throw sinConsentimiento();
        return tx.cuentaReferencia.create({ data, include: { cuenta: cuentaDeReferencia } });
      },
    );
    return vistaReferencia(r, hoy);
  },
});
