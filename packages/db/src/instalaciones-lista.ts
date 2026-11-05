import type { Instalacion } from "./generated/prisma/client";
import { notificarConsulta } from "./metricas";
import type { TenantTx } from "./transaccion";

type Fila = Omit<Instalacion, "lat" | "lng"> & {
  lat: number | null;
  lng: number | null;
  cuentaNombre: string | null;
  puestos: number;
  dotacion: number;
};
export type FiltroInstalaciones = {
  tenantId: string;
  alcance: readonly string[] | null;
  q?: string | undefined;
  cuentaId?: string | undefined;
  estado?: string | undefined;
  region?: string | undefined;
  incluirArchivadas: boolean;
  cursor?: string | undefined;
  limite: number;
};

/** Página, cuenta y agregados por instalación sin materializar todos los puestos (ADR-045). */
export async function listarInstalaciones(tx: TenantTx, f: FiltroInstalaciones) {
  const q = f.q
    ? `%${f.q.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`
    : null;
  notificarConsulta();
  return tx.$queryRaw<Fila[]>`
    /* nucleo-h:lista-instalaciones */
    WITH filtradas AS NOT MATERIALIZED (
      SELECT i.* FROM core.instalaciones i WHERE tenant_id = ${f.tenantId}::uuid
        AND (${f.alcance === null} OR id = ANY(${[...(f.alcance ?? [])]}::uuid[]))
        AND (${f.incluirArchivadas} OR archivada_en IS NULL)
        AND (${f.cuentaId ?? null}::uuid IS NULL OR cuenta_id = ${f.cuentaId ?? null}::uuid)
        AND (${f.estado ?? null}::text IS NULL OR estado = ${f.estado ?? null})
        AND (${f.region ?? null}::text IS NULL OR region = ${f.region ?? null})
        AND (${q}::text IS NULL OR nombre ILIKE ${q} OR comuna ILIKE ${q})
    ), pagina AS (
      SELECT * FROM filtradas WHERE (${f.cursor ?? null}::uuid IS NULL OR
        (nombre, id) > (SELECT nombre, id FROM filtradas WHERE id = ${f.cursor ?? null}::uuid))
      ORDER BY nombre, id LIMIT ${f.limite + 1}
    )
    SELECT i.id, i.tenant_id AS "tenantId", i.cuenta_id AS "cuentaId", i.nombre, i.estado,
      i.calle, i.comuna, i.region, i.pais, i.direccion_formateada AS "direccionFormateada",
      i.place_id AS "placeId", i.lat::float8, i.lng::float8, i.geocerca_m AS "geocercaM",
      i.vigente_desde AS "vigenteDesde", i.vigente_hasta AS "vigenteHasta", i.notas,
      i.archivada_en AS "archivadaEn", i.created_at AS "createdAt", i.updated_at AS "updatedAt",
      c.nombre AS "cuentaNombre", p.puestos, p.puestos::float8 AS dotacion
    FROM pagina i LEFT JOIN core.cuentas c ON c.id = i.cuenta_id AND c.tenant_id = i.tenant_id
    CROSS JOIN LATERAL (
      -- La dotación está deprecada (cada posición es un puesto, ADR-036): se cuentan puestos, no se suma.
      SELECT count(*)::int AS puestos
      FROM core.puestos WHERE tenant_id = i.tenant_id AND instalacion_id = i.id AND estado = 'activo'
    ) p ORDER BY i.nombre, i.id
  `;
}
