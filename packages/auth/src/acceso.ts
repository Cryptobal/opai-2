import { forTenant, forUser, globales } from "@opai/db";

/** Por qué no puede entrar: tenant suspendido o acceso suspendido (con a quién pedirlo). */
export type Bloqueo = { tenant: string; administrador: string | null; tenantSuspendido: boolean };

async function administradorDe(tenantId: string): Promise<string | null> {
  const m = await forTenant(tenantId).membership.findFirst({
    where: { rol: { in: ["owner", "admin"] }, estado: "activa" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return m?.user.name ?? null;
}

/**
 * Si el usuario puede iniciar sesión (null) o por qué no (Bloqueo). Bloquea a quien solo tiene
 * membresías suspendidas o en tenants suspendidos. Con `platformRole` siempre entra. Sin
 * membresías entra (recién creado, antes de aceptar una invitación).
 */
export async function bloqueoDeIngreso(userId: string): Promise<Bloqueo | null> {
  const usuario = await globales().user.findUnique({ where: { id: userId } });
  if (!usuario) return { tenant: "OPAI", administrador: null, tenantSuspendido: false };
  if (usuario.platformRole) return null;
  const membresias = await forUser(userId).membership.findMany({ include: { tenant: true } });
  if (membresias.length === 0) return null;
  if (membresias.some((m) => m.estado === "activa" && m.tenant.estado !== "suspendido"))
    return null;
  const primera = membresias[0];
  if (!primera) return null;
  const tenantSuspendido = primera.tenant.estado === "suspendido";
  return {
    tenant: primera.tenant.nombre,
    administrador: tenantSuspendido ? null : await administradorDe(primera.tenantId),
    tenantSuspendido,
  };
}

export async function puedeIniciarSesion(userId: string): Promise<boolean> {
  return (await bloqueoDeIngreso(userId)) === null;
}

/** Texto del bloqueo para la pantalla de login (solo se muestra tras validar la contraseña). */
export function mensajeBloqueo(b: Bloqueo): string {
  if (b.tenantSuspendido)
    return `${b.tenant} está suspendida en OPAI. Escríbenos para reactivarla.`;
  const quien = b.administrador
    ? `a ${b.administrador} (administración de ${b.tenant})`
    : "a quien administra la empresa";
  return `No puedes entrar a ${b.tenant} por ahora. Pide ${quien} que reactive tu acceso.`;
}
