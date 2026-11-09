import { ajuste, type Contexto } from "@opai/capabilities";
import { verificarPin } from "@opai/db";
import { estaBloqueada, PIN_BLOQUEO_MINUTOS_DEFECTO, PIN_INTENTOS_MAXIMOS_DEFECTO } from "@opai/domain";

import type { ResultadoIdentidad } from "../domain";

/**
 * RUT + PIN contra la credencial de terreno de la persona (B1), con el mismo bloqueo por intentos que el
 * ingreso. El fallo persiste aunque la marca termine en error (transacción independiente). Una persona
 * sin credencial no puede marcar con PIN: se la asigna RR. HH. (D-02).
 */
export async function verificarPinDePersona(
  ctx: Contexto, personaId: string, pin: string | undefined,
): Promise<Extract<ResultadoIdentidad, { ok: false }> | { ok: true }> {
  const c = await ctx.db.credencialTerreno.findUnique({ where: { personaId } });
  if (!c || !pin) return { ok: false, motivo: "credencial_invalida" };
  const ahora = new Date();
  if (estaBloqueada(c.bloqueadoHasta, ahora)) return { ok: false, motivo: "bloqueado" };
  if (await verificarPin(pin, c.pinHash)) {
    if (c.intentosFallidos > 0)
      await ctx.transaccionIndependiente((tx) => tx.credencialTerreno.update({ where: { personaId }, data: { intentosFallidos: 0 } }));
    return { ok: true };
  }
  const [intentos, minutos] = await Promise.all([
    ajuste<number>(ctx, "core", "terreno_pin_intentos_maximos").catch(() => PIN_INTENTOS_MAXIMOS_DEFECTO),
    ajuste<number>(ctx, "core", "terreno_pin_bloqueo_minutos").catch(() => PIN_BLOQUEO_MINUTOS_DEFECTO),
  ]);
  // Incremento atómico: N intentos en paralelo cuentan N veces (no leen todos el mismo contador).
  await ctx.transaccionIndependiente(async (tx) => {
    const { intentosFallidos } = await tx.credencialTerreno.update({
      where: { personaId }, data: { intentosFallidos: { increment: 1 } }, select: { intentosFallidos: true },
    });
    if (intentosFallidos >= intentos)
      await tx.credencialTerreno.updateMany({
        where: { personaId, intentosFallidos: { gte: intentos } },
        data: { intentosFallidos: 0, bloqueadoHasta: new Date(ahora.getTime() + minutos * 60_000) },
      });
  });
  return { ok: false, motivo: "credencial_invalida" };
}
