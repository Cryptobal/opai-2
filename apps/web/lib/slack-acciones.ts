import { crearContexto, type Contexto } from "@opai/capabilities";
import { usuarioPorId } from "@opai/db";
import { esRol } from "@opai/domain";

import { alcanceDe, identidadDe } from "./actor";
import { despacharDiferido, diferirConAfter, medidorDiferido } from "./medidor";

/**
 * Contexto de la persona vinculada (F2) en la empresa del espacio de Slack: sus permisos, su rol y su
 * alcance por instalación, como si actuara en OPAI (ADR-093 §1). null si ya no es miembro activo.
 */
export async function contextoDeVinculado(
  tenantId: string,
  userId: string,
): Promise<Contexto | null> {
  const user = await usuarioPorId(userId);
  if (!user) return null;
  const id = await identidadDe(user, tenantId);
  if (!id.actual || id.actual.tenantId !== tenantId) return null;
  // Slack no es un portal: el clic corre en el portal interno de la membresía (ERP o, si no tiene,
  // supervisor). Sin ninguno de los dos no hay acción (F2 solo vincula a esas personas).
  const portal = (["erp", "supervisor"] as const).find((p) => id.actual?.portales.includes(p));
  if (!portal) return null;
  return crearContexto({
    tenantId,
    actor: { tipo: "user", id: user.id },
    usuario: id.usuario,
    rol: esRol(id.actual.rol) ? id.actual.rol : null,
    permisosRol: id.acceso.permisosRol,
    excepciones: id.acceso.excepciones,
    alcance: alcanceDe(id.acceso.instalaciones),
    portal,
    portalesMembresia: id.actual.portales,
    modulosActivos: id.modulosActivos,
    modulosSoloLectura: id.modulosSoloLectura ?? [],
    medidor: medidorDiferido,
    diferir: diferirConAfter,
    despacharEventos: despacharDiferido(tenantId),
  });
}
