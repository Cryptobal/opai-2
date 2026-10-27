import { z } from "zod";

import { brechaNotificada, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";

type Hecho = {
  id: string;
  casoId: string;
  evento: string;
  estado: string;
  descripcion: string | null;
  alcance: string | null;
  datosAfectados: string | null;
  ocurridoEn: Date | null;
  destinatario: string | null;
  canal: string | null;
  plazoEn: Date | null;
  createdAt: Date;
};

/** Reduce los hechos append-only a un caso: el registro inicial y el estado y aviso vigentes. */
function resumirCaso(hechos: Hecho[]) {
  // Orden por `id` (uuid7 = orden real de creación, fijado tras el advisory lock), no por
  // `created_at` (hora de inicio de transacción): dos avisos concurrentes pueden tener el
  // `created_at` fuera de orden y dejar el caso sin figurar como «notificado».
  const orden = [...hechos].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const registro = orden.find((h) => h.evento === "registro") ?? orden[0];
  const ultimo = orden[orden.length - 1];
  const avisos = orden
    .filter((h) => h.evento === "aviso")
    .map((h) => ({
      destinatario: h.destinatario,
      canal: h.canal,
      plazoEn: h.plazoEn ? h.plazoEn.toISOString() : null,
    }));
  if (!registro || !ultimo) return null;
  return {
    casoId: registro.casoId,
    estado: ultimo.estado,
    descripcion: registro.descripcion,
    alcance: registro.alcance,
    datosAfectados: registro.datosAfectados,
    ocurridoEn: registro.ocurridoEn ? registro.ocurridoEn.toISOString() : null,
    registradoEn: registro.createdAt.toISOString(),
    actualizadoEn: ultimo.createdAt.toISOString(),
    // Avisos por destinatario (Agencia y titulares) y si la brecha ya está notificada a todos.
    avisos,
    notificada: brechaNotificada(
      avisos.map((a) => a.destinatario).filter((d): d is string => d !== null),
    ),
  };
}

export const incidentesListar = defineCapability({
  id: "core.cumplimiento.incidentes_listar",
  descripcion:
    "Lista los incidentes de seguridad y brechas del tenant con su estado vigente, alcance y, si hubo, el aviso a la Agencia o a los titulares con su plazo (Ley 21.719). Solo del tenant actual (RLS).",
  permiso: PERMISOS_CORE.cumplimientoRead,
  input: z.object({
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({
    items: z.array(
      z.object({
        casoId: z.string(),
        estado: z.string(),
        descripcion: z.string().nullable(),
        alcance: z.string().nullable(),
        datosAfectados: z.string().nullable(),
        ocurridoEn: z.string().nullable(),
        registradoEn: z.string(),
        actualizadoEn: z.string(),
        avisos: z.array(
          z.object({
            destinatario: z.string().nullable(),
            canal: z.string().nullable(),
            plazoEn: z.string().nullable(),
          }),
        ),
        notificada: z.boolean(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    // Flujo manual: pocos casos. Se traen los hechos recientes y se agrupan por caso en memoria.
    const hechos: Hecho[] = await ctx.db.incidente.findMany({
      orderBy: { id: "desc" },
      take: 1000,
    });
    const porCaso = new Map<string, Hecho[]>();
    for (const h of hechos) porCaso.set(h.casoId, [...(porCaso.get(h.casoId) ?? []), h]);
    const items = [...porCaso.values()]
      .map(resumirCaso)
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => (a.registradoEn < b.registradoEn ? 1 : -1))
      .slice(0, input.limite);
    return { items };
  },
});
