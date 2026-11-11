import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";

/**
 * Un miembro de grupo es un usuario interno: membresía ACTIVA en esta empresa con acceso al ERP,
 * donde se trabaja y se aprueba. Así un contacto del portal cliente (membresía `cliente`) o un usuario
 * suspendido no queda en un grupo que CAR-252 podrá nombrar como aprobador. La RLS acota a la
 * empresa y la FK compuesta `(tenant_id, user_id)` lo vuelve a exigir en la base.
 */
export async function exigeElegibles(ctx: Contexto, userIds: readonly string[]): Promise<void> {
  const filas = await ctx.db.membership.findMany({
    where: { userId: { in: [...userIds] }, estado: "activa", portales: { has: "erp" } },
    select: { userId: true },
  });
  const ok = new Set(filas.map((m) => m.userId));
  const fuera = userIds.filter((u) => !ok.has(u));
  if (fuera.length) {
    throw reglaDeNegocio(
      fuera.length === 1
        ? "Esa persona no se puede agregar: debe ser un usuario activo de la empresa con acceso al ERP."
        : `${fuera.length} personas no se pueden agregar: deben ser usuarios activos de la empresa con acceso al ERP.`,
      { userIds: fuera },
    );
  }
}

/** Una membresía que desaparece entre la validación y el insert viola la FK (P2003): regla de negocio. */
export async function sinMiembroAjeno<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if ((e as { code?: unknown } | null)?.code === "P2003") {
      throw reglaDeNegocio(
        "Una de esas personas ya no es usuaria de la empresa. Recarga y vuelve a intentarlo.",
      );
    }
    throw e;
  }
}
