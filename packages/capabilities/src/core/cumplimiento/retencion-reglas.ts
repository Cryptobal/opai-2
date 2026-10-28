import { type ReglaRetencion, elegibilidadPersona, reglaDe } from "@opai/domain";

import type { TenantTx } from "@opai/db";

import type { Contexto } from "../../types";
import { type Exclusiones, hasta, type Lote, lote, pagina, sinCorreo } from "./retencion-lotes";
import {
  anonimizarContacto,
  anonimizarPersona,
  MARCA_ANONIMO,
  sinRelacionViva,
  solicitudesAbiertas,
} from "./retencion-anonimizar";

export { exclusionesAbiertas, type Exclusiones, type Lote } from "./retencion-lotes";

/** Cómo busca y aplica el trabajo diario cada regla del catálogo (una por tabla con gestión «trabajo»). */
export type Ejecutor = {
  regla: ReglaRetencion;
  /** Cuántas filas tocaría hoy (simulación), con las mismas exclusiones que el lote, hasta `tope`. */
  contar(ctx: Contexto, corte: Date, ex: Exclusiones, tope: number): Promise<number>;
  /** El próximo lote vencido después de `despues` (cursor por id, orden estable). */
  lote(
    ctx: Contexto,
    corte: Date,
    ex: Exclusiones,
    tope: number,
    despues: string | null,
    ahora: Date,
    dias: number,
  ): Promise<Lote>;
  /** Aplica a un lote dentro de la transacción; devuelve las filas realmente cambiadas. */
  aplicar(tx: TenantTx, ids: string[], ahora: Date, corte: Date): Promise<number>;
};

const regla = (tabla: string): ReglaRetencion => {
  const r = reglaDe(tabla);
  if (!r) throw new Error(`Falta la regla de retención de ${tabla}.`);
  return r;
};

const sumar = async (ids: string[], f: (id: string) => Promise<boolean>) => {
  let n = 0;
  for (const id of ids) if (await f(id)) n += 1;
  return n;
};

const vencidoEnvio = (corte: Date) => ({
  createdAt: { lt: corte },
  destinatario: { not: MARCA_ANONIMO },
});

const envios: Ejecutor = {
  regla: regla("envios"),
  contar: async (ctx, corte, _ex, tope) =>
    hasta(await ctx.db.envio.count({ where: vencidoEnvio(corte) }), tope),
  lote: async (ctx, corte, _ex, tope, despues) =>
    lote(
      await ctx.db.envio.findMany({
        select: { id: true },
        ...pagina(vencidoEnvio(corte), tope, despues),
      }),
    ),
  aplicar: async (tx, ids, _ahora, corte) =>
    (
      await tx.envio.updateMany({
        where: { id: { in: ids }, ...vencidoEnvio(corte) },
        data: { destinatario: MARCA_ANONIMO },
      })
    ).count,
};

const cerradaAntes = (corte: Date) => ({
  OR: [
    { acceptedAt: { lt: corte } },
    { revocadaEn: { lt: corte } },
    { acceptedAt: null, revocadaEn: null, expiresAt: { lt: corte } },
  ],
});

const invitaciones: Ejecutor = {
  regla: regla("invitations"),
  contar: async (ctx, corte, _ex, tope) =>
    hasta(await ctx.db.invitation.count({ where: cerradaAntes(corte) }), tope),
  lote: async (ctx, corte, _ex, tope, despues) =>
    lote(
      await ctx.db.invitation.findMany({
        select: { id: true },
        ...pagina(cerradaAntes(corte), tope, despues),
      }),
    ),
  aplicar: async (tx, ids, _ahora, corte) =>
    (await tx.invitation.deleteMany({ where: { id: { in: ids }, ...cerradaAntes(corte) } })).count,
};

const candidatosContacto = (corte: Date, ex: Exclusiones) => ({
  anonimizadoEn: null,
  archivadoEn: { not: null, lt: corte },
  id: { notIn: ex.contacto },
  AND: sinCorreo("email", ex.emails),
});

const contactos: Ejecutor = {
  regla: regla("contactos"),
  contar: async (ctx, corte, ex, tope) =>
    hasta(await ctx.db.contacto.count({ where: candidatosContacto(corte, ex) }), tope),
  lote: async (ctx, corte, ex, tope, despues) =>
    lote(
      await ctx.db.contacto.findMany({
        select: { id: true },
        ...pagina(candidatosContacto(corte, ex), tope, despues),
      }),
    ),
  aplicar: (tx, ids, ahora, corte) =>
    sumar(
      ids,
      async (id) =>
        (await solicitudesAbiertas(tx, "contacto", id)) === 0 &&
        (await anonimizarContacto(tx, id, ahora, corte)),
    ),
};

const candidatasPersona = (corte: Date, ex: Exclusiones) => ({
  anonimizadaEn: null,
  id: { notIn: ex.persona },
  AND: [...sinCorreo("emailPersonal", ex.emails), ...sinCorreo("emailLaboral", ex.emails)],
  // Con vínculos (quien nunca tuvo uno no vence por política) y todos terminados antes del corte.
  vinculos: { some: {}, ...sinRelacionViva(corte).vinculos },
});

const personas: Ejecutor = {
  regla: regla("personas"),
  contar: async (ctx, corte, ex, tope) =>
    hasta(await ctx.db.persona.count({ where: candidatasPersona(corte, ex) }), tope),
  async lote(ctx, corte, ex, tope, despues, ahora, dias) {
    const filas = await ctx.db.persona.findMany({
      select: { id: true, vinculos: { select: { estado: true, termino: true } } },
      ...pagina(candidatasPersona(corte, ex), tope, despues),
    });
    // Defensa en profundidad: la regla de dominio decide, no solo el filtro de la consulta. El
    // cursor avanza por lo leído, no por lo filtrado, para no volver a leer las mismas filas.
    return {
      ids: filas.filter((f) => elegibilidadPersona(f.vinculos, dias, ahora).ok).map((f) => f.id),
      ultimo: filas.at(-1)?.id ?? null,
    };
  },
  aplicar: (tx, ids, ahora, corte) =>
    sumar(
      ids,
      async (id) =>
        (await solicitudesAbiertas(tx, "persona", id)) === 0 &&
        (await anonimizarPersona(tx, id, ahora, corte)),
    ),
};

export const EJECUTORES: readonly Ejecutor[] = [envios, invitaciones, contactos, personas];
