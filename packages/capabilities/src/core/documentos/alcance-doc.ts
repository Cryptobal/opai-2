import type { Contexto } from "../../types";
import { instalacionesEnAlcance } from "../maestros/alcance";

/** Entidades a cargo del actor acotado: sus instalaciones, las cuentas de esas y sus puestos. */
export type AlcanceEntidades = {
  instalaciones: ReadonlySet<string>;
  cuentas: ReadonlySet<string>;
  puestos: ReadonlySet<string>;
  personas: ReadonlySet<string>;
};

const VACIO: AlcanceEntidades = {
  instalaciones: new Set(),
  cuentas: new Set(),
  puestos: new Set(),
  personas: new Set(),
};

/** Conjuntos de entidades a cargo del actor, o null si ve todo el tenant (owner/admin/gerente). */
export async function entidadesEnAlcance(ctx: Contexto): Promise<AlcanceEntidades | null> {
  const ids = instalacionesEnAlcance(ctx);
  if (!ids) return null;
  if (!ids.length) return VACIO;
  // Se usan exclusivamente los IDs de filas bloqueadas, no una segunda selección ampliable.
  const insts = await ctx.transaccion(
    (tx) => tx.$queryRaw<{ id: string; cuentaId: string }[]>`
    /* nucleo-h:instalaciones */
    SELECT id, cuenta_id AS "cuentaId" FROM core.instalaciones
    WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ANY(${[...ids]}::uuid[])
    ORDER BY id FOR SHARE
  `,
  );
  const instalacionIds = insts.map((i) => i.id);
  const puestos = await ctx.transaccion(
    (tx) => tx.$queryRaw<{ id: string }[]>`
    /* nucleo-h:puestos */
    SELECT id FROM core.puestos
    WHERE tenant_id = ${ctx.tenantId}::uuid AND instalacion_id = ANY(${instalacionIds}::uuid[])
    ORDER BY id FOR SHARE
  `,
  );
  const personas = await ctx.transaccion(
    (tx) => tx.$queryRaw<{ id: string }[]>`
    /* nucleo-h:personas-vinculadas */
    SELECT p.id FROM core.personas p JOIN core.vinculos_laborales v ON v.persona_id=p.id
    WHERE p.tenant_id=${ctx.tenantId}::uuid AND v.tenant_id=${ctx.tenantId}::uuid
      AND v.estado='vigente' AND v.instalacion_id=ANY(${instalacionIds}::uuid[])
    ORDER BY p.id FOR SHARE OF p, v
  `,
  );
  return {
    personas: new Set(personas.map((p) => p.id)),
    instalaciones: new Set(instalacionIds),
    cuentas: new Set(insts.map((i) => i.cuentaId)),
    puestos: new Set(puestos.map((p) => p.id)),
  };
}

/** Si un vínculo concreto apunta a una entidad a cargo. Persona y empresa nunca lo están. */
export function vinculoEnAlcance(alc: AlcanceEntidades, tipo: string, id: string): boolean {
  if (tipo === "persona") return alc.personas.has(id);
  if (tipo === "instalacion") return alc.instalaciones.has(id);
  if (tipo === "cuenta") return alc.cuentas.has(id);
  if (tipo === "puesto") return alc.puestos.has(id);
  return false;
}

/** Ids de documentos visibles para un actor acotado (su dueño está a cargo), o null si ve todo. */
export async function documentosEnAlcance(
  ctx: Contexto,
  alc?: AlcanceEntidades | null,
): Promise<readonly string[] | null> {
  const a = alc === undefined ? await entidadesEnAlcance(ctx) : alc;
  if (!a) return null;
  if (!a.instalaciones.size && !a.cuentas.size && !a.puestos.size) return [];
  const propietarios = await ctx.transaccion(
    (tx) => tx.$queryRaw<{ documentoId: string }[]>`
    /* nucleo-h:propietarios */
    SELECT documento_id AS "documentoId" FROM core.documento_vinculos
    WHERE tenant_id = ${ctx.tenantId}::uuid AND rol = 'propietario' AND (
      (entidad_tipo = 'instalacion' AND entidad_id = ANY(${[...a.instalaciones]}::uuid[])) OR
      (entidad_tipo = 'cuenta' AND entidad_id = ANY(${[...a.cuentas]}::uuid[])) OR
      (entidad_tipo = 'puesto' AND entidad_id = ANY(${[...a.puestos]}::uuid[])) OR
      (entidad_tipo = 'persona' AND entidad_id = ANY(${[...a.personas]}::uuid[])))
    ORDER BY id FOR SHARE
  `,
  );
  return [...new Set(propietarios.map((v) => v.documentoId))];
}

/** Instalaciones a las que pertenece el dueño de un documento (persona/empresa → ninguna). */
async function instalacionesDelDueno(ctx: Contexto, documentoId: string): Promise<string[]> {
  const prop = await ctx.db.documentoVinculo.findFirst({
    where: { documentoId, rol: "propietario" },
    select: { entidadTipo: true, entidadId: true },
  });
  if (!prop) return [];
  if (prop.entidadTipo === "instalacion") return [prop.entidadId];
  if (prop.entidadTipo === "cuenta")
    return (
      await ctx.db.instalacion.findMany({
        where: { cuentaId: prop.entidadId },
        select: { id: true },
      })
    ).map((i) => i.id);
  if (prop.entidadTipo === "puesto") {
    const p = await ctx.db.puesto.findUnique({
      where: { id: prop.entidadId },
      select: { instalacionId: true },
    });
    return p ? [p.instalacionId] : [];
  }
  if (prop.entidadTipo === "persona") {
    const v = await ctx.db.vinculoLaboral.findFirst({
      where: { personaId: prop.entidadId, estado: "vigente" },
      select: { instalacionId: true },
    });
    return v?.instalacionId ? [v.instalacionId] : [];
  }
  return []; // Empresa: ningún supervisor la tiene en su alcance.
}

/**
 * Usuarios supervisores que tienen un documento en su alcance, con el mismo criterio que
 * `documentosEnAlcance` (el dueño está en una instalación a cargo). Lo usa Comunicaciones para
 * avisar de vencimientos solo a quien corresponde, no a todos los supervisores del tenant.
 */
export async function supervisoresConDocEnAlcance(
  ctx: Contexto,
  documentoId: string,
): Promise<Set<string>> {
  const instalacionIds = await instalacionesDelDueno(ctx, documentoId);
  if (!instalacionIds.length) return new Set();
  const asign = await ctx.db.supervisorInstalacion.findMany({
    where: { instalacionId: { in: instalacionIds } },
    select: { membershipId: true },
  });
  if (!asign.length) return new Set();
  const ms = await ctx.db.membership.findMany({
    where: {
      id: { in: [...new Set(asign.map((a) => a.membershipId))] },
      estado: "activa",
      rol: "supervisor",
    },
    select: { userId: true },
  });
  return new Set(ms.map((m) => m.userId));
}
