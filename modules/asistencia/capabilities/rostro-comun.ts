import { ajuste, type Contexto, prohibido, reglaDeNegocio } from "@opai/capabilities";
import { z } from "zod";

import { uuid } from "./esquemas";
import { MENSAJE_IDENTIDAD } from "./canal";
import { verificarPinDePersona } from "./identidad-pin";
import { personaPropia } from "./persona-propia";

/** Quién actúa sobre un rostro: la propia persona (sesión) o el equipo del kiosco con el PIN de la persona. */
export const quienSchema = {
  /** Con sesión puede omitirse (es la propia); en el kiosco es obligatoria. */
  personaId: uuid.optional(),
  /** Solo en el kiosco: el equipo emparejado donde se está. */
  dispositivoId: uuid.optional(),
  /** Solo en el kiosco: el PIN de la persona. Nunca se guarda. */
  credencial: z.string().max(64).optional(),
};
type Quien = { personaId?: string | undefined; dispositivoId?: string | undefined; credencial?: string | undefined };

/**
 * Autoriza una acción sobre la biometría de UNA persona (denegación segura). Con sesión de usuario solo vale la
 * propia (la sesión ya se abrió con RUT + PIN). Sin sesión, el equipo debe estar activo y la persona vinculada a su
 * instalación; las acciones que escriben exigen además el PIN de la persona (`exigirPin`).
 */
export async function autorizarPersona(ctx: Contexto, i: Quien, exigirPin: boolean): Promise<{ personaId: string; instalacionId: string | null }> {
  if (ctx.actor.tipo === "user") {
    const p = await personaPropia(ctx);
    if (i.personaId && p.id !== i.personaId) throw prohibido("Solo puedes operar sobre tu propio rostro.");
    const v = await ctx.db.vinculoLaboral.findFirst({ where: { personaId: p.id, estado: "vigente" }, select: { instalacionId: true } });
    return { personaId: p.id, instalacionId: v?.instalacionId ?? null };
  }
  if (ctx.actor.tipo !== "system" || !i.dispositivoId || !i.personaId) throw prohibido("Esta acción la hace la propia persona.");
  const personaId = i.personaId;
  const d = await ctx.db.dispositivo.findFirst({ where: { id: i.dispositivoId }, select: { estado: true, instalacionId: true } });
  if (!d || d.estado !== "activo") throw reglaDeNegocio("Este dispositivo ya no está emparejado.");
  const v = await ctx.db.vinculoLaboral.findFirst({
    where: { personaId, instalacionId: d.instalacionId, estado: "vigente", persona: { archivadaEn: null, anonimizadaEn: null } },
    select: { id: true },
  });
  if (!v) throw prohibido("La persona no está asignada a la instalación de este equipo.");
  if (exigirPin) {
    const r = await verificarPinDePersona(ctx, personaId, i.credencial);
    if (!r.ok) throw prohibido(MENSAJE_IDENTIDAD[r.motivo]);
  }
  return { personaId, instalacionId: d.instalacionId };
}

/** Interruptor de la empresa para el rostro (apagado por defecto): apagado, todos marcan con RUT y PIN. */
export async function rostroHabilitado(ctx: Contexto): Promise<boolean> {
  return ajuste<boolean>(ctx, "asistencia", "rostro_habilitado");
}

export async function exigirRostroHabilitado(ctx: Contexto): Promise<void> {
  if (!(await rostroHabilitado(ctx))) throw reglaDeNegocio("Tu empresa aún no activó el reconocimiento facial. Marca con RUT y PIN.");
}
