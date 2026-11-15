import { ETIQUETA_CLASE_PLANTILLA, PERMISOS_CORE } from "@opai/domain";

import type { Buscador } from "../maestros/buscadores";

const MAX = 5;

/**
 * Aporte de Documentos a la búsqueda global (CAR-407): plantillas laborales por nombre.
 * Los documentos ya los aporta `buscarDocumentosGlobal` (CAR-526).
 */
export const buscadoresDocumentos: readonly Buscador[] = [
  {
    modulo: "core",
    grupo: "plantillas_documento",
    titulo: "Plantillas de documento",
    permiso: PERMISOS_CORE.documentosPlantillasManage,
    async buscar(ctx, q) {
      const filas = await ctx.db.documentoPlantilla.findMany({
        where: { activa: true, nombre: { contains: q, mode: "insensitive" } },
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
        take: MAX,
        select: { id: true, nombre: true, clase: true },
      });
      return filas.map((p) => ({
        id: p.id,
        titulo: p.nombre,
        detalle: ETIQUETA_CLASE_PLANTILLA[p.clase as keyof typeof ETIQUETA_CLASE_PLANTILLA] ?? null,
        href: `/documentos/plantillas/${p.id}`,
      }));
    },
  },
];
