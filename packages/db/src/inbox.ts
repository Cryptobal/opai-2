import { notificarConsulta } from "./metricas";
import type { TenantTx } from "./transaccion";

type Aviso = {
  id: string;
  titulo: string;
  cuerpo: string | null;
  enlace: string | null;
  leidaEn: string | null;
  creadaEn: string;
};

/** Página y contador propios en una sola sentencia/snapshot, sin cargar el inbox completo. */
export async function leerInbox(
  tx: TenantTx,
  tenantId: string,
  usuarioId: string,
  soloNoLeidas: boolean,
  limite: number,
): Promise<{ items: Aviso[]; noLeidas: number }> {
  notificarConsulta(); // SQL de negocio, fuera del hook de modelos Prisma.
  const [fila] = await tx.$queryRaw<{ items: Aviso[]; noLeidas: number }[]>`
    /* nucleo-h:inbox */
    SELECT coalesce(jsonb_agg(to_jsonb(pagina) ORDER BY pagina."creadaEn" DESC, pagina.id DESC)
      FILTER (WHERE pagina.id IS NOT NULL), '[]'::jsonb) AS items,
      (SELECT count(*)::int FROM core.notificaciones
       WHERE tenant_id = ${tenantId}::uuid AND usuario_id = ${usuarioId}::uuid AND leida_en IS NULL
      ) AS "noLeidas"
    FROM (
      SELECT id, titulo, cuerpo, enlace, leida_en AS "leidaEn", created_at AS "creadaEn"
      FROM core.notificaciones WHERE tenant_id = ${tenantId}::uuid AND usuario_id = ${usuarioId}::uuid
        AND (NOT ${soloNoLeidas} OR leida_en IS NULL)
      ORDER BY created_at DESC, id DESC LIMIT ${limite}
    ) pagina
  `;
  if (!fila) throw new Error("El inbox no devolvió su resumen.");
  // jsonb serializa timestamptz en el huso de PG; el contrato público conserva ISO UTC.
  return {
    ...fila,
    items: fila.items.map((n) => ({
      ...n,
      leidaEn: n.leidaEn ? new Date(n.leidaEn).toISOString() : null,
      creadaEn: new Date(n.creadaEn).toISOString(),
    })),
  };
}
