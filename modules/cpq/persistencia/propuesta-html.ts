import { createHash } from "node:crypto";

import { noEncontrado, reglaDeNegocio, uuid7, type Contexto } from "@opai/capabilities";

import { sanearHtml, type AdvertenciaHtml, type ProblemaHtml } from "../domain/documento/sanear-html";

export type ResultadoImportacion = {
  guardada: boolean;
  /** El HTML saneado es idéntico al de la versión activa: no se crea otra versión. */
  sinCambios: boolean;
  nombre: string;
  version: number | null;
  id: string | null;
  hash: string | null;
  /** La versión es la que usa la empresa: una sola plantilla HTML en uso por empresa. */
  activa: boolean;
  /** HTML saneado para la vista previa; `null` si se rechazó. */
  html: string | null;
  catalogoVersion: number;
  problemas: ProblemaHtml[];
  advertencias: AdvertenciaHtml[];
  tokens: { usados: string[]; colecciones: string[] };
};

const sha256 = (t: string) => createHash("sha256").update(t, "utf8").digest("hex");

/**
 * Sanea y, si no hay problemas y no es una simulación, guarda el HTML como una versión nueva del nombre. Queda en
 * uso («activa») si no hay otra plantilla en uso o si reemplaza a la del mismo nombre; si otra plantilla está en
 * uso, queda «archivada» hasta que se active. Lo rechazado no se guarda. Mismo HTML saneado que la activa: sin cambios.
 */
export async function importarHtml(
  ctx: Contexto,
  d: { nombre: string; html: string; escribir: boolean },
): Promise<ResultadoImportacion> {
  const nombre = d.nombre.trim();
  if (!nombre || nombre.length > 120) throw reglaDeNegocio("El nombre de la plantilla debe tener entre 1 y 120 caracteres.");
  const actor = ctx.usuario?.id;
  if (!actor) throw reglaDeNegocio("Se necesita una persona responsable para importar la plantilla.");
  const s = sanearHtml(d.html);
  const base = { nombre, catalogoVersion: s.catalogoVersion, problemas: s.problemas, advertencias: s.advertencias, tokens: s.tokens };
  if (!s.ok) return { ...base, guardada: false, sinCambios: false, version: null, id: null, hash: null, activa: false, html: null };
  const hash = sha256(s.html);
  const activa = await ctx.db.cpqPropuestaHtml.findFirst({ where: { nombre, estado: "activa" } });
  const vista = { ...base, html: s.html };
  if (activa?.hashSha256 === hash)
    return { ...vista, guardada: false, sinCambios: true, version: activa.version, id: activa.id, hash, activa: true };
  const ultima = await ctx.db.cpqPropuestaHtml.findFirst({ where: { nombre }, orderBy: { version: "desc" }, select: { version: true } });
  const version = (ultima?.version ?? 0) + 1;
  const otraEnUso = activa ? null : await ctx.db.cpqPropuestaHtml.findFirst({ where: { estado: "activa", nombre: { not: nombre } }, select: { id: true } });
  const queda = !otraEnUso;
  if (!d.escribir) return { ...vista, guardada: false, sinCambios: false, version, id: null, hash, activa: queda };
  const id = uuid7();
  try {
    await ctx.transaccion(async (tx) => {
      if (activa) await tx.cpqPropuestaHtml.update({ where: { id: activa.id }, data: { estado: "archivada" } });
      await tx.cpqPropuestaHtml.create({
        data: {
          id, tenantId: ctx.tenantId, nombre, version, estado: queda ? "activa" : "archivada", htmlSaneado: s.html, hashSha256: hash,
          catalogoVersion: s.catalogoVersion, tokensUsados: s.tokens.usados, colecciones: s.tokens.colecciones,
          advertencias: s.advertencias.map((a) => ({ ...a })), creadoPorId: actor,
        },
      });
    });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002")
      throw reglaDeNegocio("Otra persona importó esta plantilla al mismo tiempo. Vuelve a intentarlo.");
    throw e;
  }
  return { ...vista, guardada: true, sinCambios: false, version, id, hash, activa: queda };
}

/** Pone en uso una versión (deja inactiva la que estaba en uso) o la deja inactiva: sin ninguna, rige el formato actual. */
export async function activarHtml(ctx: Contexto, d: { id: string; activa: boolean; escribir: boolean }) {
  const f = await ctx.db.cpqPropuestaHtml.findFirst({ where: { id: d.id }, select: { id: true, nombre: true, version: true } });
  if (!f) throw noEncontrado("La plantilla HTML");
  if (d.escribir) {
    await ctx.transaccion(async (tx) => {
      if (d.activa) await tx.cpqPropuestaHtml.updateMany({ where: { estado: "activa", id: { not: f.id } }, data: { estado: "archivada" } });
      await tx.cpqPropuestaHtml.update({ where: { id: f.id }, data: { estado: d.activa ? "activa" : "archivada" } });
    });
  }
  return { ...f, estado: d.activa ? ("activa" as const) : ("archivada" as const) };
}

export async function listarHtml(ctx: Contexto, nombre?: string) {
  const filas = await ctx.db.cpqPropuestaHtml.findMany({
    where: nombre ? { nombre } : {},
    orderBy: [{ nombre: "asc" }, { version: "desc" }],
    select: { id: true, nombre: true, version: true, estado: true, hashSha256: true, catalogoVersion: true, tokensUsados: true, createdAt: true },
  });
  return filas.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }));
}

export async function obtenerHtml(ctx: Contexto, id: string) {
  const f = await ctx.db.cpqPropuestaHtml.findFirst({ where: { id } });
  if (!f) throw noEncontrado("La plantilla HTML");
  return {
    id: f.id, nombre: f.nombre, version: f.version, estado: f.estado, html: f.htmlSaneado, hash: f.hashSha256,
    catalogoVersion: f.catalogoVersion, tokensUsados: f.tokensUsados, colecciones: f.colecciones,
    advertencias: f.advertencias, createdAt: f.createdAt.toISOString(),
  };
}
