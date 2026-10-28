import { type Acceso, esRol, PERMISOS_CORE, tienePermisoEfectivo } from "@opai/domain";

import type { Contexto } from "../../types";
import type { Destinatario } from "./destinatarios";

/** Si el documento es el final de un anexo de contrato (R15): trae datos de sueldo. */
export async function esDocumentoDeAnexo(ctx: Contexto, documentoId: string): Promise<boolean> {
  return (await ctx.db.anexoContrato.count({ where: { documentoId } })) > 0;
}

/**
 * De los destinatarios de un aviso, solo los que pueden ver el documento del anexo: `anexos.read` o
 * `estructuras.read_sensible` efectivos (rol base o personalizado + excepciones, ADR-022), el mismo
 * criterio de `filtroDocumentoSensible`. Así el aviso no le revela el nombre del documento a nadie
 * que no podría abrirlo.
 */
export async function conAccesoAnexo(
  ctx: Contexto,
  para: readonly Destinatario[],
): Promise<Destinatario[]> {
  if (!para.length) return [];
  const membresias = await ctx.db.membership.findMany({
    where: { estado: "activa", userId: { in: para.map((p) => p.id) } },
    include: { rolTenant: true, excepciones: true },
  });
  const permitidos = new Set(
    membresias
      .filter((m) => {
        const personalizado = m.rolTenant;
        const acceso: Acceso = {
          rol: personalizado || !esRol(m.rol) ? null : m.rol,
          // Un rol personalizado archivado deniega por defecto, igual que en la sesión (§16.2).
          permisosRol: personalizado
            ? personalizado.archivadoEn
              ? []
              : personalizado.permisos
            : null,
          excepciones: m.excepciones.map((e) => ({ permiso: e.permiso, conceder: e.conceder })),
        };
        return (
          tienePermisoEfectivo(acceso, PERMISOS_CORE.anexosRead) ||
          tienePermisoEfectivo(acceso, PERMISOS_CORE.estructurasReadSensible)
        );
      })
      .map((m) => m.userId),
  );
  return para.filter((p) => permitidos.has(p.id));
}
