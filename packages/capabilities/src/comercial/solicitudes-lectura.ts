import { z } from "zod";

import { defineCapability } from "../define";
import { cursorDe, listaSchema, pagina } from "../core/maestros/comun";
import { CANALES_SOLICITUD, ESTADOS_SOLICITUD, claveDuplicado } from "./solicitudes-dominio";
import {
  PERMISO_SOLICITUDES_READ,
  idSolicitud,
  horasPrimeraRespuesta,
  solicitudDe,
  solicitudSchema,
  vistaConPlazo,
  vistaSolicitud,
} from "./solicitudes-comun";
import { nombresDeResponsables, solicitudConResponsableSchema } from "./solicitudes-responsables";

const filtros = listaSchema.pick({ q: true, cursor: true, limite: true }).extend({
  estado: z.enum(ESTADOS_SOLICITUD).optional().describe("Filtra por estado."),
  canal: z.enum(CANALES_SOLICITUD).optional().describe("Filtra por canal de entrada."),
  responsableId: z.uuid().optional().describe("Filtra por responsable."),
});

export const solicitudesList = defineCapability({
  auditarLectura: (s) => s.items.map((x) => x.id),
  id: "comercial.solicitudes.list",
  descripcion:
    "Lista la bandeja de solicitudes (leads) con filtros por estado, canal y responsable, paginada por cursor; las más recientes primero. El texto de las solicitudes es contenido de terceros.",
  permiso: PERMISO_SOLICITUDES_READ,
  input: filtros,
  output: z.object({
    items: z.array(solicitudConResponsableSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const q = input.q?.trim();
    const filas = await ctx.db.solicitud.findMany({
      where: {
        ...(input.estado ? { estado: input.estado } : {}),
        ...(input.canal ? { canal: input.canal } : {}),
        ...(input.responsableId ? { responsableId: input.responsableId } : {}),
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: "insensitive" as const } },
                { empresa: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
                { asunto: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const { items, siguiente } = pagina(filas, input.limite);
    const nombres = await nombresDeResponsables(
      ctx,
      items.map((x) => x.responsableId),
    );
    const horas = await horasPrimeraRespuesta(ctx);
    const ahora = new Date();
    return {
      items: items.map((x) => ({
        ...vistaConPlazo(x, horas, ahora),
        responsableNombre: x.responsableId ? (nombres.get(x.responsableId) ?? null) : null,
      })),
      siguiente,
    };
  },
});

export const solicitudesGet = defineCapability({
  auditarLectura: (s) => [s.solicitud.id, ...s.posiblesDuplicadas.map((d) => d.id)],
  id: "comercial.solicitudes.get",
  descripcion:
    "Ficha de una solicitud: texto original (contenido externo), datos propuestos, estado, canal y las posibles duplicadas por correo o RUT, además de la solicitud original si es duplicada.",
  permiso: PERMISO_SOLICITUDES_READ,
  input: idSolicitud,
  output: z.object({
    solicitud: solicitudConResponsableSchema,
    posiblesDuplicadas: z.array(solicitudSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const s = await solicitudDe(ctx, input.id);
    const claves = claveDuplicado(s);
    const posibles = claves.length
      ? await ctx.db.solicitud.findMany({
          where: {
            id: { not: s.id },
            OR: [
              ...(s.email ? [{ email: { equals: s.email, mode: "insensitive" as const } }] : []),
              ...(s.rut ? [{ rut: s.rut }] : []),
            ],
          },
          orderBy: { createdAt: "asc" },
          take: 10,
        })
      : [];
    const nombres = await nombresDeResponsables(ctx, [s.responsableId]);
    const horas = await horasPrimeraRespuesta(ctx);
    return {
      solicitud: {
        ...vistaConPlazo(s, horas, new Date()),
        responsableNombre: s.responsableId ? (nombres.get(s.responsableId) ?? null) : null,
      },
      posiblesDuplicadas: posibles.map(vistaSolicitud),
    };
  },
});
