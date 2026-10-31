// Visibilidad de las actividades (ADR-022): «todas» (sin alcance por filas), «equipo» (entidades de
// las instalaciones a cargo del actor) y «propias» (las que creó o tiene asignadas). Un negocio solo
// se ve con el permiso de lectura de Comercial. Fuera de la visibilidad, la actividad responde igual
// que una inexistente.
import type { Contexto } from "../../types";
import { dondeContacto, dondeCuenta } from "../maestros/alcance";
import { ENTIDADES_ACTIVIDAD, type EntidadActividad } from "./comun";

export const PERMISO_NEGOCIOS = "comercial:negocios.read";

export type Visibilidad = {
  /** null = sin acotar por filas. */
  entidades: { instalaciones: Set<string>; cuentas: Set<string>; contactos: Set<string> } | null;
  negocios: boolean;
};

export async function visibilidad(ctx: Contexto): Promise<Visibilidad> {
  const negocios = ctx.autorizar(PERMISO_NEGOCIOS);
  if (!ctx.alcance) return { entidades: null, negocios };
  const [cuentas, contactos] = await Promise.all([
    ctx.db.cuenta.findMany({ where: dondeCuenta(ctx), select: { id: true } }),
    ctx.db.contacto.findMany({ where: dondeContacto(ctx), select: { id: true } }),
  ]);
  return {
    negocios,
    entidades: {
      instalaciones: new Set(ctx.alcance.instalaciones),
      cuentas: new Set(cuentas.map((c) => c.id)),
      contactos: new Set(contactos.map((c) => c.id)),
    },
  };
}

export function entidadVisible(v: Visibilidad, tipo: EntidadActividad, id: string): boolean {
  if (tipo === "negocio") return v.negocios;
  if (!v.entidades) return true;
  const e = v.entidades;
  return tipo === "cuenta"
    ? e.cuentas.has(id)
    : tipo === "contacto"
      ? e.contactos.has(id)
      : e.instalaciones.has(id);
}

/** De `ids`, las actividades que el actor puede ver (conserva el orden). */
export async function filtrarVisibles(ctx: Contexto, ids: readonly string[]): Promise<string[]> {
  if (!ids.length) return [];
  const vis = await visibilidad(ctx);
  if (!vis.entidades && vis.negocios) return [...ids];
  const lista = [...ids];
  const yo = ctx.usuario?.id;
  const [vinculos, propias, asignadas] = await Promise.all([
    ctx.db.actividadVinculo.findMany({ where: { actividadId: { in: lista } } }),
    yo
      ? ctx.db.actividad.findMany({
          where: { id: { in: lista }, creadaPorId: yo },
          select: { id: true },
        })
      : [],
    yo
      ? ctx.db.actividadResponsable.findMany({
          where: { actividadId: { in: lista }, usuarioId: yo },
          select: { actividadId: true },
        })
      : [],
  ]);
  const propio = new Set([...propias.map((p) => p.id), ...asignadas.map((a) => a.actividadId)]);
  return lista.filter((id) => {
    const suyos = vinculos.filter((v) => v.actividadId === id);
    if (!vis.negocios && suyos.some((v) => v.negocioId)) return false;
    if (!vis.entidades || propio.has(id)) return true;
    return suyos.some((v) =>
      ENTIDADES_ACTIVIDAD.some((t) => {
        const ref = v[`${t}Id`];
        return !!ref && entidadVisible(vis, t, ref);
      }),
    );
  });
}
