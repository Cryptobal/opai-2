import type { Prisma } from "@opai/db";

import type { Contexto } from "../../types";
import { instalacionesEnAlcance } from "../maestros/alcance";
import {
  documentoIdsTicket,
  documentoIdsVisitaEnInstalaciones,
} from "./alcance-doc-ticket-visita";
import { TICKETS_VER_TODOS, ticketVisible, visitaVisible } from "./entidad-externa";

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

/** Vínculos que se pueden nombrar sin filtrar por alcance de instalaciones (ticket y visita). */
export async function vinculoVisible(
  ctx: Contexto,
  alc: AlcanceEntidades | null,
  tipo: string,
  id: string,
): Promise<boolean> {
  if (tipo === "ticket") return (await ticketVisible(ctx, id)) !== null;
  if (tipo === "visita") return visitaVisible(ctx, id);
  return !alc || vinculoEnAlcance(alc, tipo, id);
}

/** El alcance de instalación y el permiso de tickets se aplican al dueño, no a referencias. */
export async function filtroAlcanceDocumentos(
  ctx: Contexto,
  alc?: AlcanceEntidades | null,
): Promise<Prisma.DocumentoWhereInput> {
  const a = alc === undefined ? await entidadesEnAlcance(ctx) : alc;
  if (a) {
    const ids = await documentosEnAlcance(ctx, a);
    return { id: { in: [...(ids ?? [])] } };
  }
  if (ctx.autorizar(TICKETS_VER_TODOS)) return {};
  const permitidosTicket = await documentoIdsTicket(ctx);
  return {
    OR: [
      { vinculos: { none: { rol: "propietario", entidadTipo: "ticket" } } },
      { id: { in: permitidosTicket.map((d) => d.documentoId) } },
    ],
  };
}

/** Ids de documentos visibles por dueño, o null si el actor ve todos. */
async function documentosEnAlcance(
  ctx: Contexto,
  alc?: AlcanceEntidades | null,
): Promise<readonly string[] | null> {
  const a = alc === undefined ? await entidadesEnAlcance(ctx) : alc;
  if (!a) return null;
  const inst = [...a.instalaciones];
  const cuentas = [...a.cuentas];
  const puestos = [...a.puestos];
  const personas = [...a.personas];
  if (!inst.length && !cuentas.length && !puestos.length && !personas.length && !ctx.usuario) return [];
  const nucleo = inst.length || cuentas.length || puestos.length || personas.length
    ? await ctx.transaccion(
        (tx) => tx.$queryRaw<{ documentoId: string }[]>`
    /* nucleo-h:propietarios */
    SELECT documento_id AS "documentoId" FROM core.documento_vinculos
    WHERE tenant_id = ${ctx.tenantId}::uuid AND rol = 'propietario' AND (
      (entidad_tipo = 'instalacion' AND entidad_id = ANY(${inst}::uuid[])) OR
      (entidad_tipo = 'cuenta' AND entidad_id = ANY(${cuentas}::uuid[])) OR
      (entidad_tipo = 'puesto' AND entidad_id = ANY(${puestos}::uuid[])) OR
      (entidad_tipo = 'persona' AND entidad_id = ANY(${personas}::uuid[])))
    ORDER BY id FOR SHARE
  `,
      )
    : [];
  const [visitas, tickets] = await Promise.all([
    documentoIdsVisitaEnInstalaciones(ctx, inst),
    documentoIdsTicket(ctx),
  ]);
  const ids = [...nucleo, ...visitas, ...tickets].map((v) => v.documentoId);
  return ids.length ? [...new Set(ids)] : [];
}

export { supervisoresConDocEnAlcance } from "./alcance-doc-supervisores";
