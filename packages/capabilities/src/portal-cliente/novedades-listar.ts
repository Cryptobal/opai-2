import { z } from "zod";

import { rangoDelPeriodo } from "@opai/domain";

import { tenantActual } from "../core/comun";
import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import { externo } from "../externo";
import type { Contexto } from "../types";
import { PERMISO_PORTAL, accesoDelActor } from "./comun";
import { configDeCuenta } from "./config-datos";
import { mesActual } from "./portal";
import { activa } from "./secciones";

const novedadSchema = z.object({
  id: z.string(),
  codigo: z.string().nullable(),
  fecha: z.string(),
  gravedad: z.string(),
  estado: z.string(),
  tipo: z.string().nullable(),
  /** Lo que escribió el guardia: dato de terceros, puede nombrar personas (CAR-502). */
  resumen: externo(z.string()),
  detalle: externo(z.string().nullable()),
});

/** Una página de novedades del rango, de la más reciente a la más antigua; el cursor debe ser de la misma consulta. */
async function pagina(
  ctx: Contexto,
  instalacionId: string,
  { desde, hasta }: { desde: Date; hasta: Date },
  { cursor, limite }: { cursor?: string | undefined; limite: number },
) {
  const base = { instalacionId, createdAt: { gte: desde, lt: hasta } };
  const desdeCursor = cursor
    ? await ctx.db.novedad.findFirst({
        where: { ...base, id: cursor },
        select: { id: true, createdAt: true },
      })
    : null;
  if (cursor && !desdeCursor) throw noEncontrado("La página");
  return ctx.db.novedad.findMany({
    where: {
      ...base,
      ...(desdeCursor
        ? {
            OR: [
              { createdAt: { lt: desdeCursor.createdAt } },
              { createdAt: desdeCursor.createdAt, id: { lt: desdeCursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limite + 1,
    select: {
      id: true,
      codigo: true,
      createdAt: true,
      gravedad: true,
      estado: true,
      resumen: true,
      detalle: true,
      tipoIncidente: { select: { nombre: true } },
    },
  });
}

/**
 * Libro de novedades de una instalación para el cliente (CAR-502): el texto que escribe el guardia, del mes pedido.
 * Solo si la empresa muestra las novedades y encendió el texto para esta cuenta (apagado por defecto, Ley 21.719).
 */
export const novedadesListar = defineCapability({
  id: "portal_cliente.novedades.listar",
  descripcion:
    "Libro de novedades de una instalación del Portal Cliente: las novedades del mes con su fecha, gravedad, estado y el texto que escribió el guardia. Solo para instalaciones del acceso del contacto y si la empresa encendió el texto de las novedades para su cuenta. Pagina con cursor.",
  permiso: PERMISO_PORTAL,
  input: z.object({
    instalacionId: uuidSchema,
    mes: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
    cursor: z.string().optional(),
    limite: z.number().int().min(1).max(100).default(30),
  }),
  output: z.object({
    instalacionId: z.string(),
    instalacionNombre: z.string(),
    mes: z.string(),
    items: z.array(novedadSchema),
    siguiente: z.string().nullable(),
  }),
  // El texto puede nombrar personas: la lectura queda auditada con lo revelado (NÚCLEO-H).
  auditarLectura: (s) => [s.instalacionId, ...s.items.map((n) => n.id)],
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  async handler(ctx, input) {
    const [a, tenant] = await Promise.all([accesoDelActor(ctx), tenantActual(ctx)]);
    if (!a.instalacionIds.includes(input.instalacionId)) throw noEncontrado("La instalación");
    const { config } = await configDeCuenta(ctx, a.cuentaId);
    const visibles = config.seccionesVisibles;
    if (!visibles.includes("novedades_texto") || !(await activa(ctx, "novedades", visibles)))
      throw prohibido("Tu empresa de seguridad no muestra el detalle de las novedades.");
    const actual = mesActual(tenant.timezone, new Date());
    const mes = input.mes ?? actual;
    if (mes > actual) throw reglaDeNegocio("El libro de un mes futuro aún no existe.");
    const filas = await pagina(
      ctx,
      input.instalacionId,
      rangoDelPeriodo(mes, tenant.timezone),
      input,
    );
    const vistas = filas.slice(0, input.limite);
    return {
      instalacionId: input.instalacionId,
      instalacionNombre: a.instalaciones.find((i) => i.id === input.instalacionId)?.nombre ?? "",
      mes,
      items: vistas.map((n) => ({
        id: n.id,
        codigo: n.codigo,
        fecha: n.createdAt.toISOString(),
        gravedad: n.gravedad,
        estado: n.estado,
        tipo: n.tipoIncidente?.nombre ?? null,
        resumen: n.resumen,
        detalle: n.detalle,
      })),
      siguiente: filas.length > input.limite ? vistas[vistas.length - 1]!.id : null,
    };
  },
});
