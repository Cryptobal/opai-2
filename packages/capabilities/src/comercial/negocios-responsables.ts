import { z } from "zod";

import { usuariosErp } from "../core/crm/usuarios-erp";
import { defineCapability } from "../define";
import { PERMISO_READ } from "./comun";

/**
 * Personas que pueden ser responsables de un negocio: usuarios activos del ERP de la empresa (sin
 * contactos de clientes ni trabajadores del portal), con cuántos negocios abiertos tienen. Solo nombre
 * e id: es el selector de «Transferir negocios» (CAR-27), no el directorio de usuarios.
 */
export const negociosResponsables = defineCapability({
  auditarLectura: (s) => s.map((r) => r.id),
  id: "comercial.negocios.responsables",
  descripcion:
    "Lista las personas que pueden ser responsables de negocios en la empresa, con cuántos negocios abiertos tiene cada una, para transferir cartera.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.array(z.object({ id: z.string(), nombre: z.string(), abiertos: z.number().int() })),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const [miembros, conteo] = await Promise.all([
      usuariosErp(ctx),
      ctx.db.negocio.groupBy({
        by: ["responsableId"],
        where: { estado: "abierto", archivadoEn: null },
        _count: { _all: true },
      }),
    ]);
    const abiertos = new Map(conteo.map((c) => [c.responsableId, c._count._all]));
    return miembros.map((m) => ({ ...m, abiertos: abiertos.get(m.id) ?? 0 }));
  },
});
