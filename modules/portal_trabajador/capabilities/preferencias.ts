import { z } from "zod";

import { defineCapability } from "@opai/capabilities";
import {
  CANALES_AVISO,
  CATEGORIAS_AVISO,
  esHoraValida,
  normalizarPreferencias,
  type Preferencias,
} from "@opai/domain";

import { personaPropia } from "./persona-propia";

const PORTALES = ["trabajador"] as const;

const canalesSchema = z.object({ push: z.boolean(), correo: z.boolean() });
const hora = z.string().regex(/^\d{2}:\d{2}$/).refine(esHoraValida, "Hora inválida (HH:mm).");

export const preferenciasSchema = z.object({
  preferencias: z.record(z.enum(CATEGORIAS_AVISO), canalesSchema),
  silencio: z.object({ desde: hora, hasta: hora }).nullable(),
  /** false = la persona aún no eligió: rige el silencio por defecto (ADR-020). */
  personalizadas: z.boolean(),
});

type Fila = { preferencias: unknown; silencioDesde: string | null; silencioHasta: string | null };

function vista(f: Fila | null, preferencias?: Preferencias): z.input<typeof preferenciasSchema> {
  return {
    preferencias: preferencias ?? normalizarPreferencias(f?.preferencias),
    silencio: f?.silencioDesde && f.silencioHasta ? { desde: f.silencioDesde, hasta: f.silencioHasta } : null,
    personalizadas: f !== null,
  };
}

export const preferenciasObtener = defineCapability({
  id: "portal_trabajador.preferencias_notificacion.obtener",
  descripcion:
    "Devuelve las preferencias de aviso de la propia persona del trabajador: por categoría (pauta y turnos, liquidaciones y documentos, solicitudes y tickets, avisos de la empresa) si quiere push o correo, y su horario de silencio. Sin elección previa, ningún canal externo está activo.",
  permiso: null,
  portales: PORTALES,
  // Perfil sin ids en la salida (NÚCLEO-H): queda el evento con tenant, actor y capacidad, sin contenido.
  auditarLectura: () => [],
  input: z.object({}),
  output: preferenciasSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const p = await personaPropia(ctx);
    const fila = await ctx.db.preferenciaNotificacion.findUnique({
      where: { tenantId_personaId: { tenantId: ctx.tenantId, personaId: p.id } },
    });
    return vista(fila);
  },
});

export const preferenciasActualizar = defineCapability({
  id: "portal_trabajador.preferencias_notificacion.actualizar",
  descripcion:
    "Cambia las preferencias de aviso de la propia persona del trabajador: activa o desactiva push y correo por categoría y fija o quita el horario de silencio. Solo cambia lo enviado. Acepta vista previa.",
  permiso: null,
  portales: PORTALES,
  input: z
    .object({
      preferencias: z
        .partialRecord(
          z.enum(CATEGORIAS_AVISO),
          z.object({ push: z.boolean().optional(), correo: z.boolean().optional() }),
        )
        .optional(),
      silencio: z.object({ desde: hora, hasta: hora }).nullable().optional(),
    })
    .refine((v) => v.preferencias !== undefined || v.silencio !== undefined, {
      message: "Indica al menos un cambio.",
    }),
  output: preferenciasSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = await personaPropia(ctx);
    const donde = { tenantId_personaId: { tenantId: ctx.tenantId, personaId: p.id } };
    const fila = await ctx.db.preferenciaNotificacion.findUnique({ where: donde });
    const merged = normalizarPreferencias(fila?.preferencias);
    for (const categoria of CATEGORIAS_AVISO) {
      const cambio = input.preferencias?.[categoria];
      if (!cambio) continue;
      for (const canal of CANALES_AVISO) {
        const v = cambio[canal];
        if (v !== undefined) merged[categoria][canal] = v;
      }
    }
    const silencio =
      input.silencio === undefined
        ? { desde: fila?.silencioDesde ?? null, hasta: fila?.silencioHasta ?? null }
        : { desde: input.silencio?.desde ?? null, hasta: input.silencio?.hasta ?? null };
    const nueva = { preferencias: merged, silencioDesde: silencio.desde, silencioHasta: silencio.hasta };
    if (dryRun) return vista(nueva, merged);
    await ctx.transaccion((tx) =>
      tx.preferenciaNotificacion.upsert({
        where: donde,
        create: { tenantId: ctx.tenantId, personaId: p.id, ...nueva },
        update: nueva,
      }),
    );
    return vista(nueva, merged);
  },
});
