import { filtrosPanel } from "./estructuras-panel-filtros";
import { selectAprobacionesPanel } from "./estructuras-panel-aprobaciones";
import type { Prisma } from "@opai/db";
import type { Contexto } from "../../types";
import { dondeCuenta, dondeInstalacion, dondePersona, dondePuesto } from "./alcance";
import { cursorDe } from "./comun";
import type { EntradaPanel } from "./estructuras-panel-schema";

/** Consulta consolidada por request; solo relaciones autorizadas del tenant de la sesión. */
export async function datosPanel(ctx: Contexto, input: EntradaPanel) {
  const f = input.filtros;
  const { personas, instalaciones } = filtrosPanel(ctx, input);
  const refs =
    input.tipo === "persona"
      ? [
          { nivel: "persona", personaId: input.id },
          ...(input.instalacionId
            ? [{ nivel: "instalacion", instalacionId: input.instalacionId }]
            : []),
          ...(input.puestoId ? [{ nivel: "puesto", puestoId: input.puestoId }] : []),
        ]
      : [
          {
            nivel: input.puestoId ? "puesto" : "instalacion",
            ...(input.puestoId ? { puestoId: input.puestoId } : { instalacionId: input.id }),
          },
        ];
  const select = {
    ...selectAprobacionesPanel(ctx, input),
    instalaciones: {
      where:
        input.tipo === "persona"
          ? { AND: [dondeInstalacion(ctx)], archivadaEn: null }
          : instalaciones,
      take: 100,
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      include: {
        cuenta: { select: { nombre: true } },
        puestos: { where: { estado: "activo" }, select: { dotacion: true } },
      },
    },
    cuentas: {
      where: { AND: [dondeCuenta(ctx)], archivadaEn: null },
      take: input.tipo === "instalacion" ? 100 : 0,
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      select: { id: true, nombre: true },
    },
    personas: {
      where: personas,
      take: input.tipo === "persona" ? 51 : 0,
      ...cursorDe(f.cursor),
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }, { id: "asc" }],
      include: { vinculos: { where: { estado: "vigente" }, take: 1, include: { cargo: true } } },
    },
    cargos: {
      where: { activo: true },
      ...(input.tipo === "persona" ? {} : { take: 0 }),
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true },
    },
    puestos: {
      where: {
        AND: [dondePuesto(ctx)],
        ...(input.tipo === "instalacion" ? { instalacionId: input.id } : {}),
      },
      include: { patron: true, funcion: true },
      orderBy: { nombre: "asc" },
    },
    estructuras: {
      where: {
        OR: refs,
        ...(ctx.alcance
          ? {
              AND: [
                {
                  OR: [
                    {
                      nivel: "instalacion",
                      instalacionId: { in: [...ctx.alcance.instalaciones] },
                    },
                    {
                      nivel: "puesto",
                      puesto: { instalacionId: { in: [...ctx.alcance.instalaciones] } },
                    },
                  ],
                },
              ],
            }
          : {}),
      },
      include: { items: { orderBy: { orden: "asc" } } },
      orderBy: { vigenteDesde: "desc" },
    },
    documentoVinculos: {
      where: {
        entidadTipo: "persona",
        rol: "propietario",
        documento: { estado: "disponible", venceEn: { not: null } },
      },
      ...(input.tipo === "persona" ? {} : { take: 0 }),
      select: { entidadId: true, documento: { select: { venceEn: true } } },
    },
    _count: {
      select: {
        instalaciones: {
          where: { id: input.instalacionId ?? input.id, AND: [dondeInstalacion(ctx)] },
        },
        personas: { where: personas },
        documentoVinculos: { where: { entidadTipo: input.tipo, entidadId: input.id } },
      },
    },
  } satisfies Prisma.TenantSelect;
  if (input.tipo === "instalacion") {
    const instalacion = await ctx.db.instalacion.findFirst({
      where: { id: input.id, AND: [dondeInstalacion(ctx)] },
      include: { cuenta: true, tenant: { select } },
    });
    return instalacion ? { instalacion, persona: null, datos: instalacion.tenant } : null;
  }
  const persona = await ctx.db.persona.findFirst({
    where: { id: input.id, AND: [dondePersona(ctx)] },
    include: {
      vinculos: { where: { estado: "vigente" }, take: 1, include: { cargo: true } },
      tenant: { select },
    },
  });
  return persona ? { instalacion: null, persona, datos: persona.tenant } : null;
}
