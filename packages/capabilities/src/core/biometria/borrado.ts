import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { dondePersona } from "../maestros/alcance";
import { bloquearPersona, conProveedor, descifrarReferencia, proveedorDe } from "./comun";

/**
 * Borra el rostro enrolado de una persona dentro de UNA transacción con la fila de la persona bloqueada:
 * primero en el proveedor (si falla, todo se revierte y se reintenta) y luego la referencia local, con su
 * evento. Idempotente: sin enrolamiento no hace nada. `antesDe` limita el borrado a enrolamientos hechos con
 * un consentimiento ANTERIOR a ese hecho: una revocación tardía no borra el rostro enrolado después con un
 * consentimiento nuevo.
 */
export async function borrarEnrolamiento(
  ctx: Contexto,
  personaId: string,
  motivo: "manual" | "consentimiento_revocado" | "persona_anonimizada",
  antesDe?: string,
): Promise<boolean> {
  return ctx.transaccion(async (tx) => {
    await bloquearPersona(tx, personaId);
    const fila = await tx.enrolamientoBiometrico.findUnique({ where: { personaId } });
    if (!fila || (antesDe !== undefined && fila.consentimientoId >= antesDe)) return false;
    const referencia = await descifrarReferencia(ctx, fila.referenciaCifrada);
    await conProveedor(() => proveedorDe(fila.proveedor).borrar(referencia));
    await tx.enrolamientoBiometrico.deleteMany({ where: { id: fila.id } });
    await ctx.eventos.emitir(tx, {
      tipo: "core.biometria.borrado",
      entidadTipo: "persona",
      entidadId: personaId,
      payload: { motivo },
    });
    return true;
  });
}

export const biometriaBorrar = defineCapability({
  id: "core.biometria.borrar",
  descripcion:
    "Borra el rostro enrolado de una persona, en el proveedor y en OPAI. La persona queda sin reconocimiento facial y debe volver a enrolarse; mientras tanto marca con RUT y PIN.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ personaId: uuidSchema }),
  output: z.object({ personaId: z.string(), borrado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { personaId }, { dryRun }) {
    const persona = await ctx.db.persona.findFirst({
      where: { id: personaId, ...dondePersona(ctx) },
      select: { id: true },
    });
    if (!persona) throw noEncontrado("La persona");
    if (dryRun)
      return {
        personaId,
        borrado:
          (await ctx.db.enrolamientoBiometrico.findUnique({ where: { personaId } })) !== null,
      };
    return { personaId, borrado: await borrarEnrolamiento(ctx, personaId, "manual") };
  },
});
