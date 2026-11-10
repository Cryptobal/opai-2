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
  catalogoVersion: number;
  problemas: ProblemaHtml[];
  advertencias: AdvertenciaHtml[];
  tokens: { usados: string[]; colecciones: string[] };
};

const sha256 = (t: string) => createHash("sha256").update(t, "utf8").digest("hex");

/**
 * Sanea y, si no hay problemas y no es una simulación, guarda el HTML como una versión nueva del nombre; la
 * versión activa anterior pasa a «archivada». Lo rechazado no se guarda. Mismo HTML saneado que la activa: sin cambios.
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
  if (!s.ok) return { ...base, guardada: false, sinCambios: false, version: null, id: null, hash: null };
  const hash = sha256(s.html);
  const activa = await ctx.db.cpqPropuestaHtml.findFirst({ where: { nombre, estado: "activa" } });
  if (activa?.hashSha256 === hash) return { ...base, guardada: false, sinCambios: true, version: activa.version, id: activa.id, hash };
  const ultima = await ctx.db.cpqPropuestaHtml.findFirst({ where: { nombre }, orderBy: { version: "desc" }, select: { version: true } });
  const version = (ultima?.version ?? 0) + 1;
  if (!d.escribir) return { ...base, guardada: false, sinCambios: false, version, id: null, hash };
  const id = uuid7();
  try {
    await ctx.transaccion(async (tx) => {
      if (activa) await tx.cpqPropuestaHtml.update({ where: { id: activa.id }, data: { estado: "archivada" } });
      await tx.cpqPropuestaHtml.create({
        data: {
          id, tenantId: ctx.tenantId, nombre, version, estado: "activa", htmlSaneado: s.html, hashSha256: hash,
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
  return { ...base, guardada: true, sinCambios: false, version, id, hash };
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
