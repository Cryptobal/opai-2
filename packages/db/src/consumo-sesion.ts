import { randomBytes } from "node:crypto";
import type { Prisma } from "./generated/prisma/client";
import { notificarConsulta } from "./metricas";
import { enTransaccion } from "./transaccion";

type ConsumoSesion = Omit<
  Prisma.ConsumoUncheckedCreateInput,
  "id" | "createdAt" | "costoUnitarioMicro" | "costoTotalMicro"
>;

/** Precio vigente e inserción atómicos para telemetría humana; sin caché ni presupuesto de key. */
export function registrarConsumoSesion(c: ConsumoSesion, sinCosto = false) {
  if (c.actorTipo !== "user" || c.apiKeyId || c.recurso !== "capacidad.ejecucion")
    throw new Error("Este registro solo admite ejecuciones de sesión humana.");
  const bytes = randomBytes(16);
  bytes.writeUIntBE(Date.now(), 0, 6);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const h = bytes.toString("hex");
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  return enTransaccion(c.tenantId, async (tx) => {
    notificarConsulta();
    const [fila] = await tx.$queryRaw<{ id: string }[]>`
      WITH precio AS (
        SELECT CASE WHEN ${sinCosto} THEN 0 ELSE COALESCE((
          SELECT costo_unitario_micro FROM core.precios_recursos
          WHERE recurso = ${c.recurso} AND vigente_desde <= ${new Date()}
          ORDER BY vigente_desde DESC LIMIT 1
        ), 0) END AS unitario
      )
      INSERT INTO core.consumos (
        id, tenant_id, recurso, unidad, cantidad, costo_unitario_micro, costo_total_micro,
        modulo, capability, actor_tipo, actor_id, via_user_id, api_key_id,
        portal, efecto, dry_run, ok, duracion_ms, referencia_tipo, referencia_id
      ) SELECT ${id}::uuid, ${c.tenantId}::uuid, ${c.recurso}, ${c.unidad}, ${c.cantidad}::integer,
        unitario, unitario * ${c.cantidad}::integer, ${c.modulo}, ${c.capability ?? null},
        ${c.actorTipo}, ${c.actorId ?? null}, ${c.viaUserId ?? null}, NULL,
        ${c.portal ?? null}, ${c.efecto ?? null}, ${c.dryRun ?? null}::boolean,
        ${c.ok ?? null}::boolean, ${c.duracionMs ?? null}::integer,
        ${c.referenciaTipo ?? null}, ${c.referenciaId ?? null}
      FROM precio RETURNING id
    `;
    if (!fila) throw new Error("El registro de consumo no devolvió su fila.");
    return fila;
  });
}
