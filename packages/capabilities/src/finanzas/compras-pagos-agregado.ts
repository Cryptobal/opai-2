import { Prisma, type TenantTx } from "@opai/db";

export type ProveedorPendiente = {
  proveedorId: string;
  rut: string;
  razonSocial: string;
  documentosConSaldo: number;
  saldoPorPagar: number;
  saldoVencido: number;
};

type Fila = Omit<ProveedorPendiente, "documentosConSaldo" | "saldoPorPagar" | "saldoVencido"> & {
  documentosConSaldo: bigint;
  saldoPorPagar: string;
  saldoVencido: string;
};

// Igual que contains/insensitive de Prisma: conserva comodines y escapes de búsqueda;
// el patrón entero se liga como parámetro, nunca se concatena al texto SQL.
const patronIlike = (valor: string | undefined) => valor ? `%${valor}%` : null;

function enteroSeguro(valor: bigint | string) {
  const n = Number(valor);
  if (!Number.isSafeInteger(n)) throw new RangeError("Monto o conteo fuera del rango seguro de pagos a proveedores.");
  return n;
}

/** Agrega en PostgreSQL bajo la transacción RLS del actor; no hidrata documentos ni envía sus IDs a Node. */
export async function leerProveedoresPendientes(
  tx: TenantTx,
  tenantId: string,
  hoy: string,
  q: string | undefined,
): Promise<ProveedorPendiente[]> {
  const razon = patronIlike(q);
  const rut = patronIlike(q?.replace(/[.\s]/g, ""));
  const filas = await tx.$queryRaw<Fila[]>(Prisma.sql`
    WITH saldos AS (
      SELECT d.proveedor_id, d.fecha_emision, p.plazo_pago_dias,
             p.rut, p.razon_social,
             GREATEST(d.monto_total::numeric - COALESCE(c.pagado, 0), 0) AS saldo
        FROM finanzas.documentos_recibidos d
        JOIN finanzas.proveedores p ON p.id = d.proveedor_id AND p.tenant_id = d.tenant_id
        LEFT JOIN LATERAL (
          SELECT SUM(cb.monto) AS pagado FROM finanzas.conciliaciones cb
          WHERE cb.tenant_id = d.tenant_id AND cb.tipo_enlace = 'documento_recibido'
            AND cb.enlace_id = d.id AND cb.activa AND cb.confirmada
        ) c ON true
        WHERE d.tenant_id = ${tenantId}::uuid AND d.tipo_dte <> 61
          AND (${razon}::text IS NULL OR p.razon_social ILIKE ${razon} OR p.rut ILIKE ${rut})
    )
    SELECT proveedor_id AS "proveedorId", rut, razon_social AS "razonSocial",
           COUNT(*) AS "documentosConSaldo", SUM(saldo)::text AS "saldoPorPagar",
           COALESCE(SUM(saldo) FILTER (
             WHERE fecha_emision + plazo_pago_dias < ${hoy}::date
           ), 0)::text AS "saldoVencido"
    FROM saldos WHERE saldo > 0
    GROUP BY proveedor_id, rut, razon_social
  `);
  return filas.map((fila) => ({
    ...fila,
    documentosConSaldo: enteroSeguro(fila.documentosConSaldo),
    saldoPorPagar: enteroSeguro(fila.saldoPorPagar),
    saldoVencido: enteroSeguro(fila.saldoVencido),
  }));
}

export function paginarProveedoresPendientes(filas: ProveedorPendiente[], limite: number, cursor?: string) {
  // Conservar el orden de Node; la colación de PostgreSQL puede ser distinta para nombres con acentos.
  const todos = [...filas].sort((a, b) =>
    b.saldoPorPagar - a.saldoPorPagar || a.razonSocial.localeCompare(b.razonSocial) || a.proveedorId.localeCompare(b.proveedorId),
  );
  const desde = cursor ? todos.findIndex((i) => i.proveedorId === cursor) + 1 : 0;
  const items = todos.slice(desde, desde + limite);
  const siguiente = desde + limite < todos.length ? items.at(-1)?.proveedorId ?? null : null;
  const totalPorPagar = enteroSeguro(todos.reduce((suma, i) => suma + BigInt(i.saldoPorPagar), 0n));
  return { items, siguiente, totalPorPagar };
}
