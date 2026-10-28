import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "../maestros/comun";
import { membresiaDe } from "./asignaciones";
import { exigeGestionDeRoles, validarConcedibles, validarEnCatalogo } from "./comun";

const excepcionSchema = z.object({
  permiso: z.string(),
  conceder: z.boolean(),
});

/** Excepción con su trazabilidad (A18/A19): motivo, quién la fijó y cuándo. */
const excepcionDetalleSchema = z.object({
  permiso: z.string(),
  conceder: z.boolean(),
  motivo: z.string().nullable(),
  fijadoPor: z.object({ id: z.string(), nombre: z.string() }).nullable(),
  fijadoEn: z.date(),
});

export const excepcionesList = defineCapability({
  auditarLectura: (s) => s.flatMap((e) => (e.fijadoPor ? [e.fijadoPor.id] : [])),
  id: "core.excepciones.list",
  descripcion:
    "Excepciones de permiso de un usuario (concedidas o denegadas sobre su rol) con su motivo, quién las fijó y cuándo.",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({ membershipId: uuidSchema }),
  output: z.array(excepcionDetalleSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await membresiaDe(ctx, input.membershipId);
    const filas = await ctx.db.permisoExcepcion.findMany({
      where: { membershipId: input.membershipId },
      include: { creadoPorUsuario: true },
      orderBy: { permiso: "asc" },
    });
    return filas.map((e) => ({
      permiso: e.permiso,
      conceder: e.conceder,
      motivo: e.motivo ?? null,
      fijadoPor: e.creadoPorUsuario
        ? { id: e.creadoPorUsuario.id, nombre: e.creadoPorUsuario.name }
        : null,
      // created_at refleja la última vez que se fijó (set hace delete+create): la fecha que pide A18.
      fijadoEn: e.createdAt,
    }));
  },
});

export const excepcionesSet = defineCapability({
  id: "core.excepciones.set",
  soloPersonas: true,
  descripcion:
    "Concede o deniega un permiso puntual a un usuario sobre su rol (denegar gana) con un motivo obligatorio; 'ninguna' quita la excepción. Solo owner o admin.",
  permiso: PERMISOS_CORE.usersManage,
  input: z
    .object({
      membershipId: uuidSchema,
      permiso: z.string().trim().min(1),
      efecto: z.enum(["conceder", "denegar", "ninguna"]),
      // Por qué se concede o deniega (A18/A19): obligatorio al conceder o denegar; quitar no lo pide.
      motivo: z.string().trim().min(3).max(200).optional(),
    })
    .refine((v) => v.efecto === "ninguna" || (v.motivo !== undefined && v.motivo.length >= 3), {
      message: "Indica un motivo (3 a 200 caracteres) al conceder o denegar un permiso.",
      path: ["motivo"],
    }),
  output: excepcionSchema.nullable(),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeRoles(ctx);
    const m = await membresiaDe(ctx, input.membershipId);
    const quitar = input.efecto === "ninguna";
    // El owner tiene acceso total por definición: no se le recorta con una excepción (ni al último
    // owner). Para reducir a alguien, cámbiale el rol.
    if (m.rol === "owner" && input.efecto === "denegar") {
      throw reglaDeNegocio(
        "A un owner no se le niega un permiso con una excepción; cámbiale el rol.",
      );
    }
    if (!quitar) {
      validarEnCatalogo([input.permiso]);
      // Conceder exige tenerlo; denegar es restrictivo y no escala.
      if (input.efecto === "conceder") validarConcedibles(ctx, [input.permiso]);
    } else {
      // Quitar una denegación restituye el permiso del rol: exige poder concederlo. Nadie escala
      // quitando una denegación, propia o ajena; quitar una concesión solo quita acceso y no la pide.
      const previa = await ctx.db.permisoExcepcion.findFirst({
        where: { membershipId: m.id, permiso: input.permiso },
      });
      if (previa && !previa.conceder) validarConcedibles(ctx, [input.permiso]);
    }
    const conceder = input.efecto === "conceder";
    if (dryRun) return quitar ? null : { permiso: input.permiso, conceder };
    await escribirConEvento(
      ctx,
      {
        tipo: "core.excepcion.fijada",
        entidadTipo: "membership",
        // El motivo también queda en la auditoría (no solo en la fila), para rastrear el porqué sin
        // leer `permiso_excepciones` (review 5660564536). `ninguna` quita la excepción: sin motivo.
        payload: () => ({
          permiso: input.permiso,
          efecto: input.efecto,
          motivo: input.motivo ?? null,
        }),
      },
      async (tx) => {
        await tx.permisoExcepcion.deleteMany({
          where: { membershipId: m.id, permiso: input.permiso },
        });
        if (!quitar) {
          await tx.permisoExcepcion.create({
            data: {
              tenantId: ctx.tenantId,
              membershipId: m.id,
              permiso: input.permiso,
              conceder,
              // Trazabilidad A18/A19: el porqué y el autor (el usuario que ejecuta; soloPersonas).
              motivo: input.motivo ?? null,
              creadoPor: ctx.actor.id ?? null,
            },
          });
        }
        return m;
      },
    );
    return quitar ? null : { permiso: input.permiso, conceder };
  },
});
