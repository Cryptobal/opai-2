import type { Contexto } from "../../types";

// Lotes del trabajo de retención (Ley 21.719, Brief 07d §21, CAR-39): exclusiones por solicitud
// abierta y paginación estable por id.

/**
 * Titulares con una solicitud abierta: mientras se atiende no se anonimizan por política. Incluye
 * las solicitudes que llegaron solo con el correo (§10), para personas y contactos (§21): si no se
 * excluyeran en la consulta, podrían llenar el lote y frenar la regla sin anonimizar nada.
 */
export type Exclusiones = { persona: string[]; contacto: string[]; emails: string[] };

export async function exclusionesAbiertas(ctx: Contexto): Promise<Exclusiones> {
  const filas = await ctx.db.solicitudArco.findMany({
    where: { estado: { in: ["recibida", "en_proceso"] } },
    select: { titularTipo: true, titularId: true, titularEmail: true },
  });
  const de = (tipo: string) =>
    filas.filter((f) => f.titularTipo === tipo && f.titularId).map((f) => f.titularId as string);
  const emails = [...new Set(filas.map((f) => f.titularEmail).filter((e): e is string => !!e))];
  return { persona: de("persona"), contacto: de("contacto"), emails };
}

/** Lote ordenado por id: `ultimo` es el ancla del siguiente aunque el lote no cambie nada. */
export type Lote = { ids: string[]; ultimo: string | null };

/**
 * Orden y cursor comunes a todos los lotes (§21: sin `orderBy` el lote no era determinista y un lote
 * que no cambiaba nada detenía la regla). El cursor es `id > despues` y no el `cursor` de Prisma,
 * que exige que la fila ancla siga existiendo (una invitación eliminada no existe).
 */
export const pagina = <W extends object>(where: W, tope: number, despues: string | null) => ({
  where: despues ? { AND: [where, { id: { gt: despues } }] } : where,
  orderBy: { id: "asc" as const },
  take: tope,
});
export const lote = (filas: { id: string }[]): Lote => ({
  ids: filas.map((f) => f.id),
  ultimo: filas.at(-1)?.id ?? null,
});
export const hasta = (n: number, tope: number) => Math.min(n, tope);

/** Excluye por correo sin descartar las filas sin correo (`NOT IN` con NULL las descartaría). */
export const sinCorreo = (campo: string, emails: string[]) =>
  emails.length ? [{ OR: [{ [campo]: null }, { [campo]: { notIn: emails } }] }] : [];
