import { z } from "zod";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { externo } from "../externo";
import { PERMISO_CANALES } from "./solicitudes-comun";
import {
  CANALES_SOLICITUD,
  ESTADOS_CANAL,
  ESTADO_INICIAL_CANAL,
  type CanalSolicitud,
} from "./solicitudes-dominio";
import { responsableValido } from "./validaciones";

export const canalSchema = z.object({
  canal: z.enum(CANALES_SOLICITUD),
  estado: z.enum(ESTADOS_CANAL),
  dominioAutorizado: z.string().nullable(),
  remitentesIgnorados: z.array(externo(z.string())),
  responsableId: z.string().nullable(),
});

type FilaCanal = {
  canal: string;
  estado: string;
  dominioAutorizado: string | null;
  remitentesIgnorados: string[];
  responsableId: string | null;
};

const vacio = (canal: CanalSolicitud): FilaCanal => ({
  canal,
  estado: ESTADO_INICIAL_CANAL(canal),
  dominioAutorizado: null,
  remitentesIgnorados: [],
  responsableId: null,
});

const vista = (f: FilaCanal): z.input<typeof canalSchema> => ({
  canal: f.canal as CanalSolicitud,
  estado: f.estado as (typeof ESTADOS_CANAL)[number],
  dominioAutorizado: f.dominioAutorizado,
  remitentesIgnorados: f.remitentesIgnorados,
  responsableId: f.responsableId,
});

export const canalesGet = defineCapability({
  // Perfil de configuración sin IDs de salida (NÚCLEO-H): se audita con tenant, actor y capacidad.
  auditarLectura: () => [],
  id: "comercial.canales.get",
  descripcion:
    "Muestra los cuatro canales de entrada de solicitudes (formulario web, correo, agente y manual) con su estado, dominio autorizado, remitentes ignorados y responsable por defecto. Sin credenciales: formulario y correo aparecen «sin conectar» hasta que se conecten.",
  permiso: PERMISO_CANALES,
  input: z.object({}),
  output: z.array(canalSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const filas = await ctx.db.canalSolicitud.findMany();
    return CANALES_SOLICITUD.map((c) => vista(filas.find((f) => f.canal === c) ?? vacio(c)));
  },
});

export const canalesUpdate = defineCapability({
  id: "comercial.canales.update",
  descripcion:
    "Configura un canal de entrada de solicitudes: responsable por defecto, dominio autorizado del formulario web o remitentes ignorados del correo. No conecta canales ni guarda claves.",
  permiso: PERMISO_CANALES,
  input: z.object({
    canal: z.enum(CANALES_SOLICITUD),
    responsableId: uuidSchema.nullable().optional(),
    dominioAutorizado: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Escribe solo el dominio, por ejemplo atlas.cl.")
      .nullable()
      .optional(),
    remitentesIgnorados: z.array(z.string().trim().toLowerCase().max(200)).max(100).optional(),
  }),
  output: canalSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.dominioAutorizado !== undefined && input.canal !== "formulario_web")
      throw reglaDeNegocio("El dominio autorizado es solo del formulario web.");
    if (input.remitentesIgnorados !== undefined && input.canal !== "correo")
      throw reglaDeNegocio("Los remitentes ignorados son solo del correo de entrada.");
    await responsableValido(ctx, input.responsableId);
    const actual = await ctx.db.canalSolicitud.findUnique({
      where: { tenantId_canal: { tenantId: ctx.tenantId, canal: input.canal } },
    });
    const cambios = {
      ...(input.responsableId !== undefined ? { responsableId: input.responsableId } : {}),
      ...(input.dominioAutorizado !== undefined
        ? { dominioAutorizado: input.dominioAutorizado }
        : {}),
      ...(input.remitentesIgnorados !== undefined
        ? { remitentesIgnorados: [...new Set(input.remitentesIgnorados.filter(Boolean))] }
        : {}),
    };
    if (dryRun) return vista({ ...(actual ?? vacio(input.canal)), ...cambios });
    const guardado = await ctx.transaccion(async (tx) => {
      const c = await tx.canalSolicitud.upsert({
        where: { tenantId_canal: { tenantId: ctx.tenantId, canal: input.canal } },
        create: {
          tenantId: ctx.tenantId,
          canal: input.canal,
          estado: ESTADO_INICIAL_CANAL(input.canal),
          ...cambios,
        },
        update: cambios,
      });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.canal.actualizado",
        entidadTipo: "canal_solicitud",
        entidadId: c.id,
        payload: { canal: c.canal },
      });
      return c;
    });
    return vista(guardado);
  },
});
