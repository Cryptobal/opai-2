import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { personaPropia, usuarioDe } from "./persona-propia";
import { hoyDeLaEmpresa, solicitudSchema, vistaSolicitud } from "./solicitudes-comun";

/**
 * Los permisos, vacaciones, licencias y ausencias de la propia persona del trabajador, con su estado (CAR-464): las
 * que pidió desde el portal y las que registró RR. HH. Solo las suyas (ADR-022).
 */
export const solicitudesListar = defineCapability({
  id: "portal_trabajador.solicitudes.listar",
  descripcion:
    "Lista los permisos, vacaciones, licencias y ausencias de la propia persona del trabajador, más recientes primero, con su estado: pedida, aprobada, rechazada o anulada. Solo los suyos. Paginada por cursor.",
  permiso: null,
  portales: ["trabajador"],
  // El motivo puede ser sensible (licencias): la lectura queda auditada con los registros revelados.
  auditarLectura: (s) => [s.personaId, ...s.items.map((a) => a.id)],
  input: z.object({
    cursor: z.uuid().optional().describe("Id del último registro de la página anterior."),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({
    personaId: z.string(),
    hoy: z.string().describe("Hoy (aaaa-mm-dd) en la zona de la empresa: lo primero que se puede pedir."),
    items: z.array(solicitudSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const persona = await personaPropia(ctx);
    const usuarioId = usuarioDe(ctx);
    if (input.cursor && !(await ctx.db.ausencia.findFirst({ where: { id: input.cursor, personaId: persona.id }, select: { id: true } })))
      throw noEncontrado("El registro de la página anterior");
    const filas = await ctx.db.ausencia.findMany({
      where: { personaId: persona.id },
      orderBy: [{ desde: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    const pagina = filas.slice(0, input.limite);
    return {
      personaId: persona.id,
      hoy: await hoyDeLaEmpresa(ctx),
      siguiente: filas.length > input.limite ? (pagina.at(-1)?.id ?? null) : null,
      items: pagina.map((a) => vistaSolicitud(a, usuarioId)),
    };
  },
});
