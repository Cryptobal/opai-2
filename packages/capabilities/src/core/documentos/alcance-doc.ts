// Alcance por filas de los documentos (ADR-022, Brief 07c B3). Un documento es visible para un
// supervisor solo si su DUEÑO (el vínculo `propietario`) está en su alcance: la instalación a cargo,
// la cuenta de esa instalación o un puesto de ella. Un documento cuyo dueño es una persona o la
// empresa (nivel tenant) nunca entra por aquí, aunque además tenga un vínculo a una instalación a
// cargo: los de empresa, por la decisión ya registrada; los de persona, solo con CA-B3/§16.4 (que
// hoy deniega por defecto). Ver PR-BODY.md.
import type { Contexto } from "../../types";
import { instalacionesEnAlcance } from "../maestros/alcance";

/** Entidades a cargo del actor acotado: sus instalaciones, las cuentas de esas y sus puestos. */
export type AlcanceEntidades = {
  instalaciones: ReadonlySet<string>;
  cuentas: ReadonlySet<string>;
  puestos: ReadonlySet<string>;
};

const VACIO: AlcanceEntidades = {
  instalaciones: new Set(),
  cuentas: new Set(),
  puestos: new Set(),
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
  return {
    instalaciones: new Set(instalacionIds),
    cuentas: new Set(insts.map((i) => i.cuentaId)),
    puestos: new Set(puestos.map((p) => p.id)),
  };
}

/** Si un vínculo concreto apunta a una entidad a cargo. Persona y empresa nunca lo están. */
export function vinculoEnAlcance(alc: AlcanceEntidades, tipo: string, id: string): boolean {
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
      (entidad_tipo = 'puesto' AND entidad_id = ANY(${[...a.puestos]}::uuid[])))
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
  return []; // persona o empresa (tenant): ningún supervisor lo tiene en su alcance.
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
