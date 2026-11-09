import { z } from "zod";

import { borrarEnrolamiento, defineTrabajo } from "@opai/capabilities";

import { debeSuprimirse } from "../domain";

/**
 * Destruye la biometría de quien ya no debe tenerla (L-15): personas sin vínculo vigente, archivadas o anonimizadas.
 * Borra en el proveedor y en la base con el borrado del núcleo (B4) y deja el evento. Idempotente: si el proveedor
 * falla, reintenta mañana. La revocación del consentimiento la atiende el consumidor del núcleo.
 */
export const trabajoSuprimirBiometria = defineTrabajo({
  tipo: "asistencia.biometria.suprimir",
  descripcion: "Borra la biometría de las personas desvinculadas, archivadas o anonimizadas, en el proveedor y en la base.",
  payload: z.object({}),
  periodicidad: "diaria",
  async handler(ctx) {
    const enrolados = await ctx.db.enrolamientoBiometrico.findMany({ orderBy: { updatedAt: "asc" }, take: 500, select: { personaId: true } });
    const personas = new Map(
      (await ctx.db.persona.findMany({ where: { id: { in: enrolados.map((e) => e.personaId) } }, select: { id: true, archivadaEn: true, anonimizadaEn: true } })).map((p) => [p.id, p]),
    );
    let suprimidos = 0;
    let fallidos = 0;
    for (const { personaId } of enrolados) {
      const vinculos = await ctx.db.vinculoLaboral.findMany({ where: { personaId }, select: { estado: true } });
      const p = personas.get(personaId);
      if (!(debeSuprimirse(vinculos) || !p || p.archivadaEn || p.anonimizadaEn)) continue;
      try {
        if (await borrarEnrolamiento(ctx, personaId, "desvinculacion")) suprimidos += 1;
      } catch {
        fallidos += 1;
      }
    }
    return { suprimidos, fallidos };
  },
});
