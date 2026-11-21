import { ajuste, type Contexto, reglaDeNegocio } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { enFranjaNocturna, FRANJA_NOCTURNA_FIN, FRANJA_NOCTURNA_INICIO } from "../domain/horario";

export const PERMISO_GOBERNAR = "central:agente.gobernar";

type Responsable = { tipo: "turno" | "respaldo"; usuarioId: string } | null;

/**
 * Quién está a cargo de la central ahora (R12): el operador del turno vivo o, sin turno, el
 * responsable de respaldo de Configuración, si es miembro activo. null = nadie a cargo.
 */
/** Si estamos en la franja nocturna del tenant (CAR-751). */
export async function enFranjaNocturnaTenant(ctx: Contexto, db: TenantTx = ctx.db, ahora = new Date()): Promise<boolean> {
  const [inicio, fin, t] = await Promise.all([
    ajuste<string>(ctx, "central", "franja_nocturna_inicio", db),
    ajuste<string>(ctx, "central", "franja_nocturna_fin", db),
    db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { timezone: true } }),
  ]);
  return enFranjaNocturna(ahora, inicio || FRANJA_NOCTURNA_INICIO, fin || FRANJA_NOCTURNA_FIN, t?.timezone ?? "America/Santiago");
}

/** El agente puede actuar: hay persona a cargo o es franja nocturna. */
export async function agenteConMando(ctx: Contexto, db: TenantTx = ctx.db): Promise<boolean> {
  if (await responsableActual(ctx, db)) return true;
  return enFranjaNocturnaTenant(ctx, db);
}

export async function responsableActual(ctx: Contexto, db: TenantTx = ctx.db): Promise<Responsable> {
  const turno = await db.centralTurno.findFirst({ where: { estado: { not: "cerrado" } }, select: { operadorId: true } });
  if (turno) return { tipo: "turno", usuarioId: turno.operadorId };
  const respaldo = (await ajuste<string>(ctx, "central", "responsable_respaldo", db)).trim();
  // Un valor que no es id de usuario cuenta como «sin respaldo» (el ajuste es texto libre).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(respaldo)) return null;
  const m = await db.membership.findFirst({ where: { userId: respaldo, estado: "activa" }, select: { userId: true } });
  return m ? { tipo: "respaldo", usuarioId: m.userId } : null;
}

/** Pausa vigente del agente para la empresa o para la instalación. */
async function agentePausado(db: TenantTx, instalacionId: string | null) {
  const p = await db.centralPausa.findFirst({
    where: { reanudadaEn: null, OR: [{ instalacionId: null }, ...(instalacionId ? [{ instalacionId }] : [])] },
    select: { id: true },
  });
  return p !== null;
}

/**
 * Límites del agente (R12, R13): sin una persona a cargo solo lee; pausado no actúa; en una alerta
 * tomada por un operador no actúa. A las personas no les aplica.
 */
export async function exigirAgenteHabilitado(
  ctx: Contexto,
  db: TenantTx,
  a: { instalacionId: string; tomadaPorId?: string | null } | null,
  instalacionId: string | null = a?.instalacionId ?? null,
) {
  if (!ctx.agente && ctx.principal?.tipo !== "servicio") return;
  if (!(await agenteConMando(ctx, db)))
    throw reglaDeNegocio("La central no tiene a nadie a cargo: el agente solo puede mirar.");
  if (await agentePausado(db, instalacionId)) throw reglaDeNegocio("El agente de central está en pausa aquí.");
  if (a?.tomadaPorId) throw reglaDeNegocio("Un operador tomó esta alerta: el agente no actúa en ella hasta que la devuelva.");
}
