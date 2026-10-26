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
 * Última fila (estado vigente) de un caso; NOT_FOUND si no existe. Desempata por id (uuid7). Recibe
 * el cliente (db o tx) para poder leer el estado y escribir el hecho nuevo en la misma transacción
 * (sin TOCTOU): como la tabla es append-only, el avance se valida y se anota atómicamente.
 */
export async function ultimoHecho(db: TenantTx, casoId: string) {
  const f = await db.incidente.findFirst({
    where: { casoId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (!f) throw noEncontrado("El incidente");
  return f;
}

/**
 * Todos los hechos de un caso en orden de creación (registro primero); NOT_FOUND si no existe. Para
 * el aviso de brecha, que necesita el registro (fecha de detección, para el plazo) y el conjunto de
 * destinatarios ya avisados a la vez. Dentro de una transacción con advisory lock, sin TOCTOU.
 */
export async function hechosDeCaso(db: TenantTx, casoId: string) {
  const hechos = await db.incidente.findMany({
    where: { casoId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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
