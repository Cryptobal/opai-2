import { PERMISOS_CORE } from "@opai/domain";

import type { Buscador } from "../maestros/buscadores";
import { documentosEnAlcance } from "./alcance-doc";
import { filtroDocumentoSensible } from "./sensibles";

const MAX = 5;
const contiene = (q: string) => ({ contains: q, mode: "insensitive" as const });

/**
 * Aporte de Documentos a la búsqueda global (CAR-407, parte 2 de CAR-301): documentos por título o
 * nombre de archivo y plantillas laborales por nombre. El alcance de filas (ADR-022) y el filtro de
 * documentos sensibles (anexos, cumplimiento) van en la consulta, igual que en el explorador.
 */
export const buscadoresDocumentos: readonly Buscador[] = [
  {
    modulo: "core",
    grupo: "documentos",
    titulo: "Documentos",
    permiso: PERMISOS_CORE.documentosRead,
    async buscar(ctx, q) {
      const ids = await documentosEnAlcance(ctx);
      const filas = await ctx.db.documento.findMany({
        where: {
          AND: [filtroDocumentoSensible(ctx)],
          estado: "disponible",
          ...(ids ? { id: { in: [...ids] } } : {}),
          OR: [{ titulo: contiene(q) }, { nombre: contiene(q) }],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: MAX,
        select: { id: true, titulo: true, nombre: true, tipo: { select: { nombre: true } } },
      });
      return filas.map((d) => ({
        id: d.id,
        titulo: d.titulo ?? d.nombre,
        detalle: d.tipo?.nombre ?? null,
        href: `/documentos?ver=${d.id}`,
      }));
    },
  },
  {
    modulo: "core",
    grupo: "plantillas_documento",
    titulo: "Plantillas de documento",
    permiso: PERMISOS_CORE.documentosPlantillasManage,
    async buscar(ctx, q) {
      const filas = await ctx.db.documentoPlantilla.findMany({
        where: { activa: true, nombre: contiene(q) },
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
        take: MAX,
        select: { id: true, nombre: true, clase: true },
      });
      return filas.map((p) => ({
        id: p.id,
        titulo: p.nombre,
        detalle: p.clase,
        href: `/documentos/plantillas/${p.id}`,
      }));
    },
  },
];
