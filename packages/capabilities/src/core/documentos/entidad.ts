import type { z } from "zod";

import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import type { entidadSchema } from "./vista";

export type Entidad = z.output<typeof entidadSchema>;

/** Capa de documentos de cada entidad del núcleo. */
export const CAPA_DE: Record<Entidad["tipo"], string> = {
  tenant: "empresa",
  cuenta: "cuenta",
  instalacion: "instalacion",
  persona: "persona",
  puesto: "puesto",
};

/** Verifica que la entidad exista en el tenant (RLS ya impide ver las de otros). */
export async function verificarEntidad(ctx: Contexto, e: Entidad): Promise<void> {
  const db = ctx.db;
  const existe =
    e.tipo === "tenant"
      ? e.id === ctx.tenantId
      : e.tipo === "cuenta"
        ? await db.cuenta.findUnique({ where: { id: e.id } })
        : e.tipo === "instalacion"
          ? await db.instalacion.findUnique({ where: { id: e.id } })
          : e.tipo === "persona"
            ? await db.persona.findUnique({ where: { id: e.id } })
            : await db.puesto.findUnique({ where: { id: e.id } });
  if (!existe) throw noEncontrado(`La entidad ${e.tipo}`);
}

/** El tipo de documento debe estar activo y ser de la capa de la entidad. */
export async function tipoParaEntidad(ctx: Contexto, tipoId: string | undefined, e: Entidad) {
  if (!tipoId) return null;
  const t = await ctx.db.documentoTipo.findUnique({ where: { id: tipoId } });
  if (!t) throw noEncontrado("El tipo de documento");
  if (!t.activo) throw reglaDeNegocio(`El tipo "${t.nombre}" está desactivado.`);
  if (t.capa !== CAPA_DE[e.tipo]) {
    throw reglaDeNegocio(`"${t.nombre}" es un documento de ${t.capa}, no de ${CAPA_DE[e.tipo]}.`);
  }
  return t;
}

/** Solo se versiona un documento disponible cuyo propietario es la misma entidad. */
export async function documentoAReemplazar(ctx: Contexto, id: string, e: Entidad) {
  const anterior = await ctx.db.documento.findUnique({ where: { id } });
  const propietario = anterior
    ? await ctx.db.documentoVinculo.findFirst({ where: { documentoId: id, rol: "propietario" } })
    : null;
  const mismo = propietario?.entidadTipo === e.tipo && propietario.entidadId === e.id;
  if (!anterior || anterior.estado !== "disponible" || !mismo) {
    throw noEncontrado("El documento a reemplazar (de esta misma entidad)");
  }
  return anterior;
}
