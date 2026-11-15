import { esMembresiaDeCliente, type Rol } from "@opai/domain";

import type { Contexto } from "../../types";

/**
 * Usuarios activos del ERP de la empresa (sin contactos de clientes ni trabajadores del portal),
 * ordenados por nombre. Solo id y nombre: sirve a selectores, no es el directorio de usuarios.
 */
export async function usuariosErp(ctx: Contexto): Promise<{ id: string; nombre: string }[]> {
  const miembros = await ctx.db.membership.findMany({
    where: { estado: "activa" },
    select: { userId: true, rol: true, portales: true, user: { select: { name: true } } },
  });
  return miembros
    .filter(
      (m) =>
        !esMembresiaDeCliente(m.rol as Rol, m.portales) &&
        (m.portales.length === 0 || m.portales.includes("erp")),
    )
    .map((m) => ({ id: m.userId, nombre: m.user.name }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
