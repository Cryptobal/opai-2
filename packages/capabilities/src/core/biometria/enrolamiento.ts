import { z } from "zod";

import { biometriaDelEntorno } from "@opai/integrations";
import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado } from "../../errores";
import { bloquearDekLectura } from "../cumplimiento/cifrado-campos";
import { actorLegible } from "../cumplimiento/comunes";
import { uuidSchema } from "../esquemas";
import { dondePersona } from "../maestros/alcance";
import {
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
  async handler(ctx, { personaId, muestra }, { dryRun }) {
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
    if (dryRun)
      return {
        personaId,
        proveedor: biometriaDelEntorno().nombre,
        enroladoEn: new Date().toISOString(),
      };

    const biometria = biometriaDelEntorno();
    const r = await conProveedor(() => biometria.enrolar({ sujetoId: personaId, muestra }));
    await medir(ctx, "biometria.enrolar", r.proveedor);
    try {
      const fila = await ctx.transaccion(async (tx) => {
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
      await biometria.borrar(r.referencia).catch(() => undefined);
      throw e;
    }
  },
});
