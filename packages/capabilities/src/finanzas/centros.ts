import { z } from "zod";

import { NOMBRE_CENTRO_GENERAL } from "@opai/domain";

import { defineCapability } from "../define";
import { PERMISO_READ } from "./comun";
import { centroVistaSchema } from "./vistas";

/**
 * Los centros de costo son las instalaciones más el general (decisión de Carlos, 30-oct-2026). La
 * lista sale de las instalaciones del tenant, así que una instalación nueva ya es un centro; la fila
 * en `finanzas.centros_costo` nace la primera vez que algo se asigna a él.
 */
export const centrosListar = defineCapability({
  id: "finanzas.centros_costo.listar",
  descripcion:
    "Lista los centros de costo del tenant: el general «Administración / Oficina central» y una entrada por cada instalación activa. Sirve para asignar compras y para elegir el centro por defecto de un proveedor.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.array(centroVistaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const [instalaciones, centros] = await Promise.all([
      ctx.db.instalacion.findMany({
        where: { archivadaEn: null },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
      ctx.db.centroCosto.findMany({ select: { id: true, tipo: true, instalacionId: true } }),
    ]);
    const general = centros.find((c) => c.tipo === "general");
    const porInstalacion = new Map(centros.map((c) => [c.instalacionId, c.id]));
    return [
      { id: general?.id ?? null, tipo: "general" as const, instalacionId: null, nombre: NOMBRE_CENTRO_GENERAL },
      ...instalaciones.map((i) => ({
        id: porInstalacion.get(i.id) ?? null,
        tipo: "instalacion" as const,
        instalacionId: i.id,
        nombre: i.nombre,
      })),
    ];
  },
});
