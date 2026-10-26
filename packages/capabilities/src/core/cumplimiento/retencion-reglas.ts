import { type ReglaRetencion, elegibilidadPersona, reglaDe } from "@opai/domain";

import type { TenantTx } from "@opai/db";

import type { Contexto } from "../../types";
import {
  anonimizarContacto,
  anonimizarPersona,
  MARCA_ANONIMO,
  sinRelacionViva,
  solicitudesAbiertas,
} from "./retencion-anonimizar";

/** Titulares con una solicitud abierta: mientras se atiende no se anonimizan por política. */
export type Exclusiones = { persona: string[]; contacto: string[] };

export async function exclusionesAbiertas(ctx: Contexto): Promise<Exclusiones> {
  const filas = await ctx.db.solicitudArco.findMany({
    where: { estado: { in: ["recibida", "en_proceso"] }, titularId: { not: null } },
    select: { titularTipo: true, titularId: true },
  });
  const de = (tipo: string) =>
    filas.filter((f) => f.titularTipo === tipo).map((f) => f.titularId as string);
  return { persona: de("persona"), contacto: de("contacto") };
}

/** Cómo busca y aplica el trabajo diario cada regla del catálogo (una por tabla con gestión «trabajo»). */
export type Ejecutor = {
  regla: ReglaRetencion;
  contar(ctx: Contexto, corte: Date, ex: Exclusiones): Promise<number>;
  /** Ids del próximo lote vencido. */
  lote(ctx: Contexto, corte: Date, ex: Exclusiones, tope: number, ahora: Date, dias: number): Promise<string[]>;
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

const envios: Ejecutor = {
  regla: regla("envios"),
  contar: (ctx, corte) =>
    ctx.db.envio.count({ where: { createdAt: { lt: corte }, destinatario: { not: MARCA_ANONIMO } } }),
  lote: async (ctx, corte, _ex, tope) =>
    (
      await ctx.db.envio.findMany({
        where: { createdAt: { lt: corte }, destinatario: { not: MARCA_ANONIMO } },
        select: { id: true },
        take: tope,
      })
    ).map((f) => f.id),
  aplicar: async (tx, ids, _ahora, corte) =>
    (
      await tx.envio.updateMany({
        where: { id: { in: ids }, createdAt: { lt: corte }, destinatario: { not: MARCA_ANONIMO } },
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
  contar: (ctx, corte) => ctx.db.invitation.count({ where: cerradaAntes(corte) }),
  lote: async (ctx, corte, _ex, tope) =>
    (await ctx.db.invitation.findMany({ where: cerradaAntes(corte), select: { id: true }, take: tope })).map((f) => f.id),
  aplicar: async (tx, ids, _ahora, corte) =>
    (await tx.invitation.deleteMany({ where: { id: { in: ids }, ...cerradaAntes(corte) } })).count,
};

const contactos: Ejecutor = {
  regla: regla("contactos"),
  contar: (ctx, corte, ex) =>
    ctx.db.contacto.count({
      where: { anonimizadoEn: null, archivadoEn: { not: null, lt: corte }, id: { notIn: ex.contacto } },
    }),
  lote: async (ctx, corte, ex, tope) =>
    (
      await ctx.db.contacto.findMany({
        where: { anonimizadoEn: null, archivadoEn: { not: null, lt: corte }, id: { notIn: ex.contacto } },
        select: { id: true },
        take: tope,
      })
    ).map((f) => f.id),
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
  // Con vínculos (quien nunca tuvo uno no vence por política) y todos terminados antes del corte.
  vinculos: { some: {}, ...sinRelacionViva(corte).vinculos },
});

const personas: Ejecutor = {
  regla: regla("personas"),
  contar: (ctx, corte, ex) => ctx.db.persona.count({ where: candidatasPersona(corte, ex) }),
  async lote(ctx, corte, ex, tope, ahora, dias) {
    const filas = await ctx.db.persona.findMany({
      where: candidatasPersona(corte, ex),
      select: { id: true, vinculos: { select: { estado: true, termino: true } } },
      take: tope,
    });
    // Defensa en profundidad: la regla de dominio decide, no solo el filtro de la consulta.
    return filas.filter((f) => elegibilidadPersona(f.vinculos, dias, ahora).ok).map((f) => f.id);
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
