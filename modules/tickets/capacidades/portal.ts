import { z } from "zod";

import { accesoConSeccion, defineCapability, externo, noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";
import { diaEnZona } from "@opai/domain";

import { ROL_PORTAL_CLIENTE } from "../domain";
import { cursorDe, estadoSchema, listaSchema, pagina, uuidSchema } from "./esquemas";
import { ID_VISTA_PREVIA, insertarTicket, responsablePorDefecto } from "./util";

/**
 * Tickets del Portal Cliente (CAR-519). Sin permiso de módulo (`permiso: null`, como `cpq.portal_cotizaciones.*`):
 * el acceso lo decide `accesoConSeccion` (FAIL-CLOSED, ADR-022), que exige un contacto con acceso completo a su
 * cuenta, el módulo activo, la sección encendida por la empresa y por la cuenta.
 */
const PERMISO_PORTAL = null;

/** Tipos que la empresa abrió a los clientes: activos, marcados para el portal y sin aprobación interna. */
const TIPO_PARA_CLIENTES = { activo: true, requiereAprobacion: false, rolesPermitidos: { has: ROL_PORTAL_CLIENTE } };
const tiposParaClientes = (ctx: Contexto) =>
  ctx.db.tipoTicket.findMany({
    where: TIPO_PARA_CLIENTES,
    select: { id: true, nombre: true, descripcion: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

const itemSchema = z.object({
  id: uuidSchema,
  // Lo escribió el propio contacto: texto de terceros para un agente (ADR-034).
  titulo: externo(z.string()),
  tipo: z.string(),
  estado: estadoSchema,
  instalacion: z.string(),
  /** Día en que lo abrió (aaaa-mm-dd), en la zona de la empresa. */
  abiertoEl: z.string(),
});

export const portalTicketsListar = defineCapability({
  id: "tickets.portal_tickets.listar",
  descripcion:
    "Tickets que el contacto abrió en el Portal Cliente, del más reciente al más antiguo, con su estado y la instalación; trae también los tipos y las instalaciones con que puede abrir uno. Sin notas internas. Pagina con cursor.",
  permiso: PERMISO_PORTAL,
  input: listaSchema.extend({ limite: z.number().int().min(1).max(100).default(30) }),
  output: z.object({
    items: z.array(itemSchema),
    siguiente: z.string().nullable(),
    tipos: z.array(z.object({ id: uuidSchema, nombre: z.string(), descripcion: z.string().nullable() })),
    instalaciones: z.array(z.object({ id: uuidSchema, nombre: z.string() })),
  }),
  // El asunto es texto libre que puede nombrar personas: la lectura queda auditada con los tickets revelados (NÚCLEO-H).
  auditarLectura: (s) => s.items.map((t) => t.id),
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  async handler(ctx, input) {
    const a = await accesoConSeccion(ctx, "tickets");
    const filas = await ctx.db.ticket.findMany({
      // Solo los suyos y de instalaciones que todavía ve: un acceso acotado después no revela tickets viejos.
      where: { solicitanteId: ctx.usuario?.id ?? "", instalacionId: { in: a.instalacionIds } },
      orderBy: { id: "desc" },
      include: { tipo: { select: { nombre: true } } },
      ...cursorDe(input.cursor, input.limite),
    });
    const { items, siguiente } = pagina(filas, input.limite, input.cursor);
    const nombres = new Map(a.instalaciones.map((i) => [i.id, i.nombre]));
    const tenant = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { timezone: true } });
    return {
      items: items.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        tipo: t.tipo.nombre,
        estado: estadoSchema.parse(t.estado),
        instalacion: nombres.get(t.instalacionId ?? "") ?? "",
        abiertoEl: diaEnZona(t.createdAt, tenant?.timezone),
      })),
      siguiente,
      tipos: await tiposParaClientes(ctx),
      instalaciones: a.instalaciones.map((i) => ({ id: i.id, nombre: i.nombre })),
    };
  },
});

export const portalTicketsCrear = defineCapability({
  id: "tickets.portal_tickets.crear",
  descripcion:
    "El contacto del cliente abre un ticket en el Portal Cliente sobre una instalación de su acceso, con un tipo que la empresa abrió a los clientes; lo recibe el responsable por defecto del tipo.",
  permiso: PERMISO_PORTAL,
  input: z.object({
    instalacionId: uuidSchema,
    tipoId: uuidSchema,
    titulo: z.string().trim().min(3).max(140),
    descripcion: z.string().trim().min(3).max(4000),
  }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  portales: ["cliente"],
  async handler(ctx, input, { dryRun }) {
    const a = await accesoConSeccion(ctx, "tickets");
    if (!a.instalacionIds.includes(input.instalacionId)) throw noEncontrado("La instalación");
    const tipo = await ctx.db.tipoTicket.findFirst({
      where: { ...TIPO_PARA_CLIENTES, id: input.tipoId },
    });
    if (!tipo) throw noEncontrado("El tipo de ticket");
    // Sin responsable configurado el error real es interno: el cliente recibe uno genérico.
    const responsableId = await responsablePorDefecto(ctx, tipo).catch(() => {
      throw reglaDeNegocio("Este tipo de ticket no se puede abrir ahora. Avisa a tu empresa de seguridad.");
    });
    if (dryRun) return { id: ID_VISTA_PREVIA };
    return insertarTicket(ctx, {
      tipoId: tipo.id,
      titulo: input.titulo,
      descripcion: input.descripcion,
      prioridad: "p3",
      responsableId,
      instalacionId: input.instalacionId,
    });
  },
});
