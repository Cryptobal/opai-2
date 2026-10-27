import { z } from "zod";

import type { TenantTx } from "@opai/db";

import { noEncontrado } from "../../errores";

export const incidenteVista = z.object({
  casoId: z.string(),
  estado: z.string(),
  ultimoEvento: z.string(),
  registradoEn: z.string(),
});

/**
 * Última fila (estado vigente) de un caso; NOT_FOUND si no existe. Ordena por `id` (uuid7), que
 * Prisma genera al crear la fila —tras el advisory lock— y refleja el orden real de creación; no por
 * `created_at`, que es la hora de INICIO de la transacción y puede quedar fuera de orden entre dos
 * avisos concurrentes. Recibe el cliente (db o tx) para leer el estado y escribir el hecho nuevo en
 * la misma transacción (sin TOCTOU): como la tabla es append-only, se valida y se anota atómicamente.
 */
export async function ultimoHecho(db: TenantTx, casoId: string) {
  const f = await db.incidente.findFirst({
    where: { casoId },
    orderBy: { id: "desc" },
  });
  if (!f) throw noEncontrado("El incidente");
  return f;
}

/**
 * Todos los hechos de un caso en orden de creación (registro primero); NOT_FOUND si no existe. Para
 * el aviso de brecha, que necesita el registro (fecha de detección, para el plazo) y el conjunto de
 * destinatarios ya avisados a la vez. Ordena por `id` (uuid7 = orden real de creación tras el lock),
 * no por `created_at` (hora de inicio de transacción). Dentro de una transacción con advisory lock,
 * sin TOCTOU.
 */
export async function hechosDeCaso(db: TenantTx, casoId: string) {
  const hechos = await db.incidente.findMany({
    where: { casoId },
    orderBy: { id: "asc" },
  });
  if (!hechos.length) throw noEncontrado("El incidente");
  return hechos;
}

/**
 * Bloqueo por caso dentro de la transacción: serializa los avisos y avances del mismo incidente, para
 * que dos avisos concurrentes (Agencia y titulares) no dejen el caso sin marcar como «notificado»
 * (sin TOCTOU en la completitud de los avisos). En las bases en memoria de prueba (`$executeRaw` no es
 * una función) es un no-op: las pruebas corren en serie.
 */
export async function bloquearCaso(tx: TenantTx, casoId: string): Promise<void> {
  const ejecutar = (tx as { $executeRaw?: unknown }).$executeRaw;
  if (typeof ejecutar === "function")
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${casoId}, 0))`;
}

export const salidaIncidente = (f: {
  casoId: string;
  estado: string;
  evento: string;
  createdAt: Date;
}) => ({
  casoId: f.casoId,
  estado: f.estado,
  ultimoEvento: f.evento,
  registradoEn: f.createdAt.toISOString(),
});
