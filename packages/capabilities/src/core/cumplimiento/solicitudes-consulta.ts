import { z } from "zod";

import { ESTADOS_SOLICITUD, PERMISOS_CORE, semaforoPlazo, TIPOS_SOLICITUD } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { cursorDe, definidos, pagina } from "../maestros/comun";
import { solicitudSchema, vistaSolicitud } from "./comunes";
import { dondeSolicitud } from "./solicitudes-alcance";

const conSemaforo = (f: Parameters<typeof vistaSolicitud>[0]) => ({
  ...vistaSolicitud(f),
  semaforo: semaforoPlazo(f.plazoEn, new Date()),
});

export const solicitudesListar = defineCapability({
  id: "core.cumplimiento.solicitudes_listar",
  descripcion:
    "Bandeja de solicitudes del titular (ARCO+) del tenant, con su tipo, estado, plazo y semáforo de vencimiento (Ley 21.719). Filtra por estado y por tipo; pagina por cursor.",
  permiso: PERMISOS_CORE.cumplimientoRead,
  input: z.object({
    estado: z.enum(ESTADOS_SOLICITUD).optional(),
    tipo: z.enum(TIPOS_SOLICITUD).optional(),
    cursor: uuidSchema.optional(),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({
    items: z.array(solicitudSchema.extend({ semaforo: z.string() })),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  auditarLectura: (salida) => salida.items.map((s) => s.id),
  dryRun: false,
  async handler(ctx, input) {
    const where = {
      ...definidos({ estado: input.estado, tipo: input.tipo }),
      ...(await dondeSolicitud(ctx)),
    };
    // Un cursor ajeno/inexistente nunca se usa como ancla de ordenación para enumerar la bandeja.
    if (
      input.cursor &&
      !(await ctx.db.solicitudArco.findFirst({
        where: { ...where, id: input.cursor },
        select: { id: true },
      }))
    )
      throw noEncontrado("La solicitud");
    const filas = await ctx.db.solicitudArco.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const { items, siguiente } = pagina(filas, input.limite);
    return { items: items.map(conSemaforo), siguiente };
  },
});

export const solicitudObtener = defineCapability({
  id: "core.cumplimiento.solicitud_obtener",
  descripcion:
    "Devuelve una solicitud del titular (ARCO+) con su tipo, estado, plazo, responsable, resultado y la evidencia asociada (Ley 21.719). Solo del tenant actual (RLS).",
  permiso: PERMISOS_CORE.cumplimientoRead,
  input: z.object({ id: uuidSchema }),
  output: solicitudSchema.extend({ semaforo: z.string() }),
  efecto: "lectura",
  auditarLectura: (salida) => [salida.id],
  dryRun: false,
  async handler(ctx, input) {
    const s = await ctx.db.solicitudArco.findFirst({
      where: { id: input.id, ...(await dondeSolicitud(ctx)) },
    });
    if (!s) throw noEncontrado("La solicitud");
    return conSemaforo(s);
  },
});
