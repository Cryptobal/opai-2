import { z } from "zod";

import { defineTrabajo } from "@opai/capabilities";

import { debeSuprimirse } from "../domain";
import { darDeBaja } from "./biometria-comun";

/**
 * Destruye la biometría de quien ya no debe tenerla (L-15): personas sin vínculo vigente, archivadas o
 * anonimizadas, y rostros cuyo consentimiento se revocó pero el proveedor no alcanzó a borrar. Borra en el
 * proveedor y en la base y deja el hecho en la bitácora. Idempotente: si el proveedor falla, reintenta mañana.
 */
export const trabajoSuprimirBiometria = defineTrabajo({
  tipo: "asistencia.biometria.suprimir",
  descripcion: "Borra la biometría de las personas desvinculadas o sin consentimiento vigente, en el proveedor y en la base.",
  payload: z.object({}),
  periodicidad: "diaria",
  async handler(ctx) {
    const activos = await ctx.db.enrolamientoFacial.findMany({
      where: { estado: "activo" }, orderBy: { updatedAt: "asc" }, take: 500, select: { id: true, personaId: true, referencia: true },
    });
    const personas = new Map(
      (await ctx.db.persona.findMany({ where: { id: { in: activos.map((a) => a.personaId) } }, select: { id: true, archivadaEn: true, anonimizadaEn: true } }))
        .map((p) => [p.id, p]),
    );
    let suprimidos = 0;
    let fallidos = 0;
    for (const e of activos) {
      const [vinculos, consentimiento] = await Promise.all([
        ctx.db.vinculoLaboral.findMany({ where: { personaId: e.personaId }, select: { estado: true } }),
        ctx.db.consentimientoPersona.findFirst({ where: { personaId: e.personaId, tipo: "biometria_facial", revocadoEn: null } }),
      ]);
      const desvinculada = debeSuprimirse(vinculos) || !!personas.get(e.personaId)?.archivadaEn || !!personas.get(e.personaId)?.anonimizadaEn;
      if (!desvinculada && consentimiento) continue;
      try {
        await darDeBaja(ctx, e, desvinculada ? "desvinculacion" : "consentimiento");
        suprimidos += 1;
      } catch {
        fallidos += 1;
      }
    }
    return { suprimidos, fallidos };
  },
});
