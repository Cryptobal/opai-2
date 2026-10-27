import type { TenantTx } from "./transaccion";

export const periodoDeMes = (fecha: Date) =>
  new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));

/** Lock por tenant/key: inicialización, chequeo, cargo y aviso se serializan juntos. */
export async function consumirPresupuesto(
  tx: TenantTx,
  tenantId: string,
  apiKeyId: string,
  costoMicro: bigint,
  opciones: {
    /**
     * El gasto (IA, mapas, correo, almacenamiento…) ya ocurrió con el proveedor antes de medirlo:
     * no puede rechazarse sin perder trazabilidad (BRIEF-02 §4.9: la ejecución en curso termina y
     * se registra; la SIGUIENTE recibe `BUDGET_EXCEEDED`, nunca ésta). Solo lo prepagado
     * (`capacidad.ejecucion`, antes del handler) puede rechazarse sin incurrir en el gasto.
     */
    yaIncurrido?: boolean;
  } = {},
) {
  if (costoMicro < 0n) throw new Error("El costo no puede ser negativo.");
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${apiKeyId}`}, 0))`;
  const key = await tx.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!key) throw new Error("API key inválida.");
  // `topeMicro` de la tabla es NOT NULL: 0 es el centinela de "sin tope" (mismo que usa la key).
  const tope = key.presupuestoMensualMicro ?? 0n;
  const sinTope = tope === 0n;
  const periodo = periodoDeMes(new Date());
  const previo = await tx.consumo.aggregate({
    where: { apiKeyId, createdAt: { gte: periodo } },
    _sum: { costoTotalMicro: true },
  });
  const vigente = await tx.gastoAgenteMes.findUnique({
    where: { tenantId_apiKeyId_periodo: { tenantId, apiKeyId, periodo } },
  });
  // Si el tope cambió desde el último cargo (lo sube o lo baja quien administra la key, o lo fija por
  // primera vez), los avisos de ESTE período se reinician: si no, un tope distinto nunca vuelve a
  // avisar al 80 %/100 % porque la marca quedó puesta bajo el tope anterior (el ledger quedaría
  // desincronizado del tope vigente).
  const topeCambio = vigente !== null && vigente.topeMicro !== tope;
  // El ledger acumula `gastadoMicro` SIEMPRE, también sin tope: si se fija un tope después, debe
  // partir de lo ya gastado en el período, no de cero (Revisor, PR #70).
  const gasto = await tx.gastoAgenteMes.upsert({
    where: { tenantId_apiKeyId_periodo: { tenantId, apiKeyId, periodo } },
    create: {
      tenantId,
      apiKeyId,
      periodo,
      gastadoMicro: previo._sum.costoTotalMicro ?? 0n,
      topeMicro: tope,
    },
    update: topeCambio
      ? { topeMicro: tope, aviso80En: null, aviso100En: null }
      : { topeMicro: tope },
  });
  const excedido =
    !sinTope && (gasto.gastadoMicro >= tope || gasto.gastadoMicro + costoMicro > tope);
  if (excedido && !opciones.yaIncurrido) return false;
  const gastado = gasto.gastadoMicro + costoMicro;
  const aviso80 = !sinTope && gasto.aviso80En === null && gastado * 10n >= tope * 8n;
  const aviso100 = !sinTope && gasto.aviso100En === null && gastado >= tope;
  await tx.gastoAgenteMes.update({
    where: { id: gasto.id },
    data: {
      gastadoMicro: gastado,
      ...(aviso80 ? { aviso80En: new Date() } : {}),
      ...(aviso100 ? { aviso100En: new Date() } : {}),
    },
  });
  for (const umbral of [...(aviso80 ? [80] : []), ...(aviso100 ? [100] : [])]) {
    await tx.evento.create({
      data: {
        tenantId,
        tipo: `core.agente.presupuesto_${umbral}`,
        entidadTipo: "api_key",
        entidadId: apiKeyId,
        actorTipo: "agent",
        actorId: apiKeyId,
        viaUserId: key.userId,
        payload: {
          agente: key.nombre,
          consumoUsd: (Number(gastado) / 1_000_000).toLocaleString("es-CL", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          presupuestoUsd: (Number(tope) / 1_000_000).toLocaleString("es-CL", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
      },
    });
  }
  return true;
}
