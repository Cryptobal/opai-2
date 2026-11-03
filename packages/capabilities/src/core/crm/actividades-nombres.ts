// Nombres legibles de una actividad (CAR-162): quién la creó, sus responsables y sus vínculos, para
// que la pantalla y los agentes no tengan que resolver ids. Una consulta por tipo de entidad.
import { z } from "zod";

import type { Contexto } from "../../types";
import { ENTIDADES_ACTIVIDAD, type EntidadActividad } from "./comun";

export const nombresActividadSchema = {
  creadaPorNombre: z.string().nullable(),
  responsablesDetalle: z.array(z.object({ id: z.string(), nombre: z.string() })),
  vinculosDetalle: z.array(
    z.object({ tipo: z.enum(ENTIDADES_ACTIVIDAD), id: z.string(), nombre: z.string() }),
  ),
};

type Base = {
  creadaPorId: string | null;
  responsables: string[];
  vinculos: { tipo: EntidadActividad; id: string }[];
};

const ids = (vs: Base[], tipo: EntidadActividad) => [
  ...new Set(vs.flatMap((v) => v.vinculos.filter((x) => x.tipo === tipo).map((x) => x.id))),
];

async function mapa<T extends { id: string }>(
  lista: string[],
  leer: (ids: string[]) => Promise<T[]>,
  nombre: (fila: T) => string,
) {
  const filas = lista.length ? await leer(lista) : [];
  return new Map(filas.map((f) => [f.id, nombre(f)]));
}

/** Agrega los nombres a un lote de vistas (los vínculos ya vienen filtrados por visibilidad). */
export async function conNombres<T extends Base>(ctx: Contexto, vistas: T[]) {
  if (!vistas.length) return [];
  const usuarios = [
    ...new Set(vistas.flatMap((v) => [...v.responsables, ...(v.creadaPorId ? [v.creadaPorId] : [])])),
  ];
  const [u, negocio, cuenta, contacto, instalacion] = await Promise.all([
    mapa(
      usuarios,
      (x) => ctx.db.user.findMany({ where: { id: { in: x } }, select: { id: true, name: true } }),
      (f) => f.name,
    ),
    mapa(
      ids(vistas, "negocio"),
      (x) => ctx.db.negocio.findMany({ where: { id: { in: x } }, select: { id: true, titulo: true } }),
      (f) => f.titulo,
    ),
    mapa(
      ids(vistas, "cuenta"),
      (x) => ctx.db.cuenta.findMany({ where: { id: { in: x } }, select: { id: true, nombre: true } }),
      (f) => f.nombre,
    ),
    mapa(
      ids(vistas, "contacto"),
      (x) =>
        ctx.db.contacto.findMany({
          where: { id: { in: x } },
          select: { id: true, nombres: true, apellidos: true },
        }),
      (f) => `${f.nombres} ${f.apellidos}`.trim(),
    ),
    mapa(
      ids(vistas, "instalacion"),
      (x) =>
        ctx.db.instalacion.findMany({ where: { id: { in: x } }, select: { id: true, nombre: true } }),
      (f) => f.nombre,
    ),
  ]);
  const porTipo = { negocio, cuenta, contacto, instalacion };
  return vistas.map((v) => ({
    ...v,
    creadaPorNombre: v.creadaPorId ? (u.get(v.creadaPorId) ?? null) : null,
    responsablesDetalle: v.responsables.map((id) => ({ id, nombre: u.get(id) ?? "Usuario" })),
    vinculosDetalle: v.vinculos.map((x) => ({ ...x, nombre: porTipo[x.tipo].get(x.id) ?? "" })),
  }));
}
