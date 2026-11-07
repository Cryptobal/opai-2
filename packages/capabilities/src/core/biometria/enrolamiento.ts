import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import type { Contexto } from "../../types";
import { biometriaDe } from "../../integraciones/biometria";
import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import { bloquearDekLectura } from "../cumplimiento/cifrado-campos";
import { actorLegible } from "../cumplimiento/comunes";
import { uuidSchema } from "../esquemas";
import { dondePersona } from "../maestros/alcance";
import {
  bloquearPersona,
  cifrarReferencia,
  conProveedor,
  consentimientoVigente,
  medir,
  muestraSchema,
  sinConsentimiento,
} from "./comun";

const vista = z.object({
  personaId: z.string(),
  proveedor: z.string(),
  enroladoEn: z.string(),
});

export const biometriaEnrolar = defineCapability({
  id: "core.biometria.enrolar",
  descripcion:
    "Enrola el rostro de una persona para el reconocimiento facial de terreno. Exige su consentimiento vigente (finalidad biometria_asistencia) y una prueba de vida; no guarda la imagen, solo una referencia cifrada del proveedor.",
  permiso: PERMISOS_CORE.personasManage,
  // La muestra es una imagen del rostro: no pasa por agentes ni por el MCP.
  soloPersonas: true,
  sensibles: ["muestra"],
  input: z.object({ personaId: uuidSchema, muestra: muestraSchema }),
  output: vista,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, { personaId, muestra }, { dryRun }) => enrolarRostro(ctx, personaId, muestra, dryRun),
});

/**
 * Enrola el rostro de una persona ya autorizada por quien llama (RR. HH. o la propia persona con su PIN):
 * consentimiento vigente, proveedor de la empresa, referencia cifrada y evento, todo en una transacción con la
 * persona bloqueada. No guarda la imagen.
 */
export async function enrolarRostro(ctx: Contexto, personaId: string, muestra: string, dryRun: boolean) {
  const persona = await ctx.db.persona.findFirst({
    where: { id: personaId, ...dondePersona(ctx), archivadaEn: null, anonimizadaEn: null },
    select: { id: true },
  });
  if (!persona) throw noEncontrado("La persona");
  const consentimiento = await consentimientoVigente(ctx.db, personaId);
  if (!consentimiento) throw sinConsentimiento();
  if (await ctx.db.enrolamientoBiometrico.findUnique({ where: { personaId } }))
    throw conflicto(
      "La persona ya tiene su rostro enrolado. Bórralo antes de enrolarla de nuevo.",
    );
  const prov = await biometriaDe(ctx);
  if (!prov)
    throw reglaDeNegocio(
      "El reconocimiento facial no está disponible en esta empresa: falta proveedor o autorización.",
    );
  const biometria = prov.b;
  if (dryRun)
    return { personaId, proveedor: biometria.nombre, enroladoEn: new Date().toISOString() };

  const r = await conProveedor(() => biometria.enrolar({ sujetoId: personaId, muestra, coleccion: prov.coleccion }));
  await medir(ctx, "biometria.enrolar", r.proveedor);
  // Si la falla es «ya estaba enrolada», la referencia del proveedor es la del enrolamiento vigente: no se retira.
  let retirar = true;
  try {
    const fila = await ctx.transaccion(async (tx) => {
      // Con la persona bloqueada se revalida todo: una revocación o un enrolamiento concurrente ya están confirmados.
      await bloquearPersona(tx, personaId);
      if (!(await consentimientoVigente(tx, personaId))) throw sinConsentimiento();
      if (await tx.enrolamientoBiometrico.findUnique({ where: { personaId } })) {
        retirar = false;
        throw conflicto(
          "La persona ya tiene su rostro enrolado. Bórralo antes de enrolarla de nuevo.",
        );
      }
      await bloquearDekLectura(tx, ctx.tenantId);
      const f = await tx.enrolamientoBiometrico.create({
        data: {
          tenantId: ctx.tenantId,
          personaId,
          consentimientoId: consentimiento.id,
          proveedor: r.proveedor,
          referenciaCifrada: await cifrarReferencia(ctx, tx, r.referencia),
          enroladoPor: actorLegible(ctx),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.biometria.enrolado",
        entidadTipo: "persona",
        entidadId: personaId,
        payload: { proveedor: r.proveedor },
      });
      return f;
    });
    return { personaId, proveedor: fila.proveedor, enroladoEn: fila.createdAt.toISOString() };
  } catch (e) {
    // Si no quedó guardada, el rostro no puede quedar enrolado en el proveedor: se retira.
    if (retirar) await biometria.borrar(r.referencia, prov.coleccion).catch(() => undefined);
    throw e;
  }
}
