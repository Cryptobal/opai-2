import type { Contexto } from "../../types";
import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { dondeInstalacion, dondePuesto } from "./alcance";

/** D8: las concesiones del 07c se conservan; el contrato lo editan owner/admin. */
export function exigirEdicionVinculo(ctx: Contexto) {
  if (ctx.rol !== "owner" && ctx.rol !== "admin")
    throw prohibido("Solo owner y admin modifican el vínculo laboral.");
}

export async function validarDestino(
  ctx: Contexto,
  v: {
    instalacionId?: string | null | undefined;
    puestoId?: string | null | undefined;
    horasSemanales?: number | null | undefined;
    distribucion?: string | null | undefined;
  },
) {
  if (!v.instalacionId || !v.horasSemanales || !v.distribucion?.trim())
    throw reglaDeNegocio("Completa instalación y jornada pactada del vínculo.");
  await ctx.transaccion(
    (tx) => tx.$queryRaw`
    /* 07b:bloqueo-destino */
    SELECT id FROM core.instalaciones WHERE tenant_id=${ctx.tenantId}::uuid AND id=${v.instalacionId}::uuid
      AND (NOT ${Boolean(ctx.alcance)} OR id=ANY(${[...(ctx.alcance?.instalaciones ?? [])]}::uuid[])) FOR SHARE
  `,
  );
  const i = await ctx.db.instalacion.findFirst({
    where: { id: v.instalacionId, AND: [dondeInstalacion(ctx)], archivadaEn: null },
  });
  if (!i) throw noEncontrado("La referencia");
  if (v.puestoId) {
    await ctx.transaccion(
      (tx) => tx.$queryRaw`
      /* 07b:bloqueo-destino */
      SELECT id FROM core.puestos WHERE tenant_id=${ctx.tenantId}::uuid AND id=${v.puestoId}::uuid
        AND instalacion_id=${i.id}::uuid FOR SHARE
    `,
    );
    const p = await ctx.db.puesto.findFirst({
      where: { id: v.puestoId, instalacionId: i.id, estado: "activo", AND: [dondePuesto(ctx)] },
    });
    if (!p) throw noEncontrado("La referencia");
  }
}

/** Serializa edición/terminación de un mismo vínculo, dentro de la transacción de ejecución. */
export async function bloquearVinculo(ctx: Contexto, id: string) {
  await ctx.transaccion(
    (tx) => tx.$queryRaw`
    /* 07b:bloqueo-vinculo */
    SELECT id FROM core.vinculos_laborales
    WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${id}::uuid
      AND (NOT ${Boolean(ctx.alcance)} OR persona_id IN (
        SELECT persona_id FROM core.vinculos_laborales
        WHERE tenant_id=${ctx.tenantId}::uuid AND estado='vigente'
          AND instalacion_id=ANY(${[...(ctx.alcance?.instalaciones ?? [])]}::uuid[])
      )) FOR UPDATE
  `,
  );
}
