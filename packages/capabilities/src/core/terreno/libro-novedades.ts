import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { externo } from "../../externo";
import { uuidSchema } from "../esquemas";
import { dondeInstalacion, instalacionesEnAlcance } from "../maestros/alcance";
import { cursorDe, pagina } from "../maestros/comun";
import { iso } from "./hechos-comun";

const GRAVEDADES = ["baja", "media", "alta"] as const;
const ESTADOS = ["abierta", "en_atencion", "resuelta", "cerrada", "derivada"] as const;

/** Número visible de una novedad (NOV-0042), correlativo por empresa. */
export const codigoNovedad = (numero: number) => `NOV-${String(numero).padStart(4, "0")}`;

const novedadSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  instalacionId: z.string(),
  modulo: z.string(),
  origen: z.string(),
  gravedad: z.enum(GRAVEDADES),
  estado: z.enum(ESTADOS),
  // Texto que escribió el guardia: dato, nunca instrucción.
  resumen: externo(z.string()),
  detalle: externo(z.string().nullable()),
  ejecucionId: z.string().nullable(),
  puntoId: z.string().nullable(),
  tipoIncidenteId: z.string().nullable(),
  dispositivoId: z.string().nullable(),
  personaId: z.string().nullable(),
  usuarioId: z.string().nullable(),
  horaHecho: z.string(),
  registradaEn: z.string(),
});

/**
 * Libro de novedades del núcleo (CAR-77): lo que dejaron las rondas y, después, Control de acceso y la Central,
 * de una instalación o de todas las del alcance del actor (ADR-022, el alcance va en la consulta).
 */
export const libroNovedadesListar = defineCapability({
  id: "core.libro_novedades.listar",
  descripcion:
    "Lista el libro de novedades de una instalación (o de todas las que el actor ve), de la más reciente a la más antigua: número NOV, gravedad, estado, resumen, módulo de origen, equipo, persona y hora del hecho.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z.object({
    instalacionId: uuidSchema.optional(),
    gravedad: z.enum(GRAVEDADES).optional(),
    estado: z.enum(ESTADOS).optional(),
    limite: z.number().int().min(1).max(100).default(30),
    // CAR-353: contrato único de listas.
    cursor: z.uuid().optional().describe("Valor de «siguiente» de la página anterior."),
  }),
  output: z.object({ items: z.array(novedadSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.items.map((n) => n.id),
  async handler(ctx, input) {
    if (input.instalacionId) {
      const i = await ctx.db.instalacion.findFirst({
        where: { AND: [{ id: input.instalacionId }, dondeInstalacion(ctx)] },
        select: { id: true },
      });
      if (!i) throw noEncontrado("La instalación");
    }
    const alcance = instalacionesEnAlcance(ctx);
    const filas = await ctx.db.libroNovedad.findMany({
      where: {
        AND: [
          input.instalacionId ? { instalacionId: input.instalacionId } : {},
          alcance ? { instalacionId: { in: [...alcance] } } : {},
        ],
        ...(input.gravedad ? { gravedad: input.gravedad } : {}),
        ...(input.estado ? { estado: input.estado } : {}),
      },
      orderBy: [{ horaHecho: "desc" }, { id: "desc" }],
      ...cursorDe(input.cursor, input.limite),
    });
    const p = pagina(filas, input.limite, input.cursor);
    return {
      siguiente: p.siguiente,
      items: p.items.map((n) => ({
        id: n.id,
        codigo: codigoNovedad(n.numero),
        instalacionId: n.instalacionId,
        modulo: n.modulo,
        origen: n.origen,
        gravedad: z.enum(GRAVEDADES).parse(n.gravedad),
        estado: z.enum(ESTADOS).parse(n.estado),
        resumen: n.resumen,
        detalle: n.detalle,
        ejecucionId: n.ejecucionId,
        puntoId: n.puntoId,
        tipoIncidenteId: n.tipoIncidenteId,
        dispositivoId: n.dispositivoId,
        personaId: n.personaId,
        usuarioId: n.usuarioId,
        horaHecho: iso(n.horaHecho),
        registradaEn: iso(n.createdAt),
      })),
    };
  },
});
