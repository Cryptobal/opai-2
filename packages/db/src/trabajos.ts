import { enTransaccion } from "./transaccion";
import { forTenant } from "./for-tenant";

export type TrabajoReclamado = {
  id: string;
  tipo: string;
  payload: unknown;
  intentos: number;
  maxIntentos: number;
};

/**
 * Cola de trabajos de un tenant (ADR-029). `reclamar` toma trabajos vencidos (o en curso con el
 * bloqueo expirado) con FOR UPDATE SKIP LOCKED: dos runners concurrentes nunca toman el mismo.
 */
export function colaDeTrabajos(tenantId: string) {
  return {
    reclamar(limite: number): Promise<TrabajoReclamado[]> {
      return enTransaccion(tenantId, async (tx) => {
        // Bloqueo vencido sin intentos restantes (el proceso murió en el último): fallido.
        await tx.$executeRaw`
          UPDATE "core"."trabajos"
          SET estado = 'fallido', bloqueado_hasta = NULL, updated_at = now(),
              ultimo_error = COALESCE(ultimo_error, 'Bloqueo vencido sin intentos restantes.')
          WHERE estado = 'en_curso' AND bloqueado_hasta < now() AND intentos >= max_intentos`;
        return tx.$queryRaw<TrabajoReclamado[]>`
          UPDATE "core"."trabajos"
          SET estado = 'en_curso', intentos = intentos + 1,
              bloqueado_hasta = now() + interval '10 minutes', updated_at = now()
          WHERE id IN (
            SELECT id FROM "core"."trabajos"
            WHERE (estado = 'pendiente' AND programado_para <= now())
               OR (estado = 'en_curso' AND bloqueado_hasta < now() AND intentos < max_intentos)
            ORDER BY programado_para
            LIMIT ${limite}
            FOR UPDATE SKIP LOCKED)
          RETURNING id, tipo, payload, intentos, max_intentos AS "maxIntentos"`;
      });
    },
    async completar(id: string, resultado: unknown): Promise<void> {
      await forTenant(tenantId).trabajo.update({
        where: { id },
        data: {
          estado: "hecho",
          bloqueadoHasta: null,
          ultimoError: null,
          resultado: JSON.parse(JSON.stringify(resultado ?? null)),
        },
      });
    },
    async fallar(id: string, error: string, reintentarEn: Date | null): Promise<void> {
      await forTenant(tenantId).trabajo.update({
        where: { id },
        data: reintentarEn
          ? {
              estado: "pendiente",
              programadoPara: reintentarEn,
              bloqueadoHasta: null,
              ultimoError: error,
            }
          : { estado: "fallido", bloqueadoHasta: null, ultimoError: error },
      });
    },
  };
}

export type ColaDeTrabajos = ReturnType<typeof colaDeTrabajos>;
