import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { personaPropia } from "./persona-propia";

const contacto = z.object({
  nombre: z.string().nullable(),
  correo: z.string().nullable(),
  telefono: z.string().nullable(),
});

export const privacidadSchema = z.object({
  /** Quien atiende los derechos del titular (DPO), según el perfil de la empresa. */
  dpo: contacto,
  empresa: z.string().nullable(),
  /** Datos que la empresa tiene del trabajador y para qué (resumen legible, sin valores). */
  datosTratados: z.array(z.object({ dato: z.string(), finalidad: z.string() })),
  /** Última decisión por finalidad (otorgado o revocado). Solo lectura: se registran en RR.HH. */
  consentimientos: z.array(
    z.object({ finalidad: z.string(), estado: z.enum(["otorgado", "revocado"]), desde: z.string() }),
  ),
  /** Solicitudes ARCO que la persona tiene abiertas o resueltas. */
  solicitudes: z.array(
    z.object({
      id: z.string(),
      tipo: z.string(),
      estado: z.string(),
      recibidaEn: z.string(),
      plazoEn: z.string().nullable(),
    }),
  ),
});

/** Inventario legible de lo que `core.personas` guarda (Ley 21.719, RAT del Núcleo). */
const DATOS_TRATADOS = [
  { dato: "Nombre, RUT y fecha de nacimiento", finalidad: "Contrato de trabajo y obligaciones laborales" },
  { dato: "Teléfono, correo y dirección", finalidad: "Comunicarnos contigo y cumplir obligaciones laborales" },
  { dato: "Turnos, asistencia y rondas", finalidad: "Ejecución del servicio y control de jornada" },
] as const;

export const privacidadObtener = defineCapability({
  id: "portal_trabajador.privacidad.obtener",
  descripcion:
    "Resume la privacidad de la propia persona del trabajador (Ley 21.719): quién atiende sus derechos (DPO), qué datos se tratan y para qué, sus consentimientos vigentes y sus solicitudes ARCO. Solo lee lo de la persona vinculada a su usuario.",
  permiso: null,
  portales: ["trabajador"],
  auditarLectura: (s) => s.solicitudes.map((x) => x.id),
  input: z.object({}),
  output: privacidadSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const p = await personaPropia(ctx);
    const [perfil, consentimientos, solicitudes] = await Promise.all([
      ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }),
      ctx.db.consentimiento.findMany({
        where: { titularTipo: "persona", titularId: p.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      ctx.db.solicitudArco.findMany({
        where: { titularTipo: "persona", titularId: p.id },
        orderBy: { recibidaEn: "desc" },
        take: 20,
      }),
    ]);
    // Append-only: la última fila de cada finalidad es la decisión vigente.
    const vigentes = new Map<string, (typeof consentimientos)[number]>();
    for (const c of consentimientos) if (!vigentes.has(c.proposito)) vigentes.set(c.proposito, c);
    return {
      dpo: {
        nombre: perfil?.dpoNombre ?? null,
        correo: perfil?.dpoCorreo ?? null,
        telefono: perfil?.dpoTelefono ?? null,
      },
      empresa: perfil?.nombreComercial ?? perfil?.razonSocial ?? null,
      datosTratados: DATOS_TRATADOS.map((d) => ({ ...d })),
      consentimientos: [...vigentes.values()].map((c) => ({
        finalidad: c.proposito,
        estado: c.estado === "revocado" ? ("revocado" as const) : ("otorgado" as const),
        desde: c.createdAt.toISOString(),
      })),
      solicitudes: solicitudes.map((s) => ({
        id: s.id,
        tipo: s.tipo,
        estado: s.estado,
        recibidaEn: s.recibidaEn.toISOString(),
        plazoEn: s.plazoEn?.toISOString() ?? null,
      })),
    };
  },
});
