import { forUser, globales } from "@opai/db";

/**
 * Si el usuario puede iniciar sesión. Bloquea a quien solo tiene membresías en tenants
 * suspendidos (o membresías suspendidas). Con `platformRole` siempre entra. Sin membresías
 * entra a una pantalla sin acceso (por ejemplo, recién creado, antes de aceptar una invitación).
 */
export async function puedeIniciarSesion(userId: string): Promise<boolean> {
  const usuario = await globales().user.findUnique({ where: { id: userId } });
  if (!usuario) return false;
  if (usuario.platformRole) return true;
  const membresias = await forUser(userId).membership.findMany({ include: { tenant: true } });
  if (membresias.length === 0) return true;
  return membresias.some((m) => m.estado === "activa" && m.tenant.estado !== "suspendido");
}
