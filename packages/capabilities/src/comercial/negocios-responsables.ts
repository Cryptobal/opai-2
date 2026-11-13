import { esMembresiaDeCliente, type Rol } from "@opai/domain";
import { z } from "zod";

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
      ctx.db.membership.findMany({
        where: { estado: "activa" },
        select: { userId: true, rol: true, portales: true, user: { select: { name: true } } },
      }),
      ctx.db.negocio.groupBy({
        by: ["responsableId"],
        where: { estado: "abierto", archivadoEn: null },
        _count: { _all: true },
      }),
    ]);
    const abiertos = new Map(conteo.map((c) => [c.responsableId, c._count._all]));
    return miembros
      .filter((m) => !esMembresiaDeCliente(m.rol as Rol, m.portales) && (m.portales.length === 0 || m.portales.includes("erp")))
      .map((m) => ({ id: m.userId, nombre: m.user.name, abiertos: abiertos.get(m.userId) ?? 0 }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  },
});
