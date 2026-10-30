import type { TenantTx } from "@opai/db";
import { codigoCotizacion, siguienteNumero } from "@opai/domain";

/**
 * Siguiente código CPQ-AAAA-NNN del tenant y el año (R54), DENTRO de la transacción que crea la
 * cotización. El advisory lock por tenant y año serializa a dos creaciones concurrentes: la segunda
 * espera al COMMIT de la primera y lee su número, sin TOCTOU. El índice único parcial
 * (tenant_id, anio, numero) es la red de seguridad si algo esquivara el lock. Sigue desde el último
 * número del año, también el importado de 1.0; los de 1.0 con sufijo tienen `numero` null y no
 * cuentan. Siempre en `ctx.transaccion` (nunca sobre `forTenant`): `$executeRaw` no fija el tenant.
 */
export async function siguienteCodigo(
  tx: TenantTx,
  tenantId: string,
  anio: number,
): Promise<{ codigo: string; anio: number; numero: number }> {
  // La base en memoria de los tests no tiene $executeRaw; en Postgres siempre existe.
  if (typeof (tx as { $executeRaw?: unknown }).$executeRaw === "function") {
    const clave = `cpq.correlativo:${tenantId}:${anio}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
  }
  const ultimo = await tx.cotizacion.findFirst({
    where: { anio, numero: { not: null } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const numero = siguienteNumero(ultimo?.numero);
  return { codigo: codigoCotizacion(anio, numero), anio, numero };
}
