import { z } from "zod";

import {
  ejemplosDe,
  ErrorPlantilla,
  PERMISOS_CORE,
  renderizarCorreo,
  rutasDe,
  validarPlantilla,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { comunicableDe, comunicables, marcaDe, plantillaVigente } from "./resolver";

const canalSchema = z.enum(["correo", "inapp"]);
const plantillaSchema = z.object({
  asunto: z.string(),
  cuerpo: z.string(),
  version: z.number().nullable().describe("null = plantilla por defecto de OPAI."),
});

export function eventoComunicable(evento: string) {
  const e = comunicableDe(evento);
  if (!e) throw noEncontrado(`El evento comunicable "${evento}"`);
  return e;
}

export const comunicacionesEventos = defineCapability({
  id: "core.comunicaciones.eventos",
  descripcion:
    "Catálogo de eventos comunicables (invitaciones, vencimientos, aprobaciones, presupuestos…) con sus variables, canales, plantilla vigente y si tienen regla activa.",
  permiso: PERMISOS_CORE.comunicacionesManage,
  input: z.object({}),
  output: z.array(
    z.object({
      evento: z.string(),
      nombre: z.string(),
      descripcion: z.string(),
      transaccional: z.boolean(),
      variables: z.array(
        z.object({
          ruta: z.string(),
          tipo: z.string(),
          ejemplo: z.string(),
          descripcion: z.string(),
        }),
      ),
      canales: z.array(
        z.object({ canal: z.string(), version: z.number().nullable(), reglaActiva: z.boolean() }),
      ),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const reglas = await ctx.db.notificacionRegla.findMany({ where: { activa: true } });
    return Promise.all(
      comunicables().map(async (e) => ({
        evento: e.evento,
        nombre: e.nombre,
        descripcion: e.descripcion,
        transaccional: e.transaccional,
        variables: [...e.variables],
        canales: await Promise.all(
          (Object.keys(e.plantillas) as ("correo" | "inapp")[]).map(async (canal) => ({
            canal,
            version: (await plantillaVigente(ctx.db, e, canal))?.version ?? null,
            reglaActiva:
              e.transaccional || reglas.some((r) => r.evento === e.evento && r.canal === canal),
          })),
        ),
      })),
    );
  },
});

export const plantillasGet = defineCapability({
  id: "core.plantillas.get",
  descripcion:
    "Plantilla vigente de un evento y canal (la editada por la empresa o la de OPAI) y el historial de versiones editadas.",
  permiso: PERMISOS_CORE.comunicacionesManage,
  input: z.object({ evento: z.string(), canal: canalSchema }),
  output: z.object({
    vigente: plantillaSchema.nullable(),
    porDefecto: plantillaSchema.nullable(),
    versiones: z.array(plantillaSchema.extend({ activa: z.boolean(), creadaEn: z.string() })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const e = eventoComunicable(input.evento);
    const versiones = await ctx.db.plantilla.findMany({
      where: { evento: e.evento, canal: input.canal },
      orderBy: { version: "desc" },
      take: 20,
    });
    const base = e.plantillas[input.canal];
    return {
      vigente: await plantillaVigente(ctx.db, e, input.canal),
      porDefecto: base ? { ...base, version: null } : null,
      versiones: versiones.map((v) => ({
        asunto: v.asunto ?? "",
        cuerpo: v.cuerpo,
        version: v.version,
        activa: v.activa,
        creadaEn: v.createdAt.toISOString(),
      })),
    };
  },
});

/** Valida asunto y cuerpo contra las variables declaradas; traduce el error a UNPROCESSABLE. */
export function validarTextos(
  e: ReturnType<typeof eventoComunicable>,
  asunto: string,
  cuerpo: string,
) {
  try {
    validarPlantilla(asunto, rutasDe(e));
    validarPlantilla(cuerpo, rutasDe(e));
  } catch (error) {
    if (error instanceof ErrorPlantilla) throw reglaDeNegocio(error.message);
    throw error;
  }
}

export async function vistaPrevia(ctx: Contexto, evento: string, asunto: string, cuerpo: string) {
  const e = eventoComunicable(evento);
  validarTextos(e, asunto, cuerpo);
  return renderizarCorreo(
    e,
    { asunto, cuerpo },
    ejemplosDe(e),
    await marcaDe(ctx.db, ctx.tenantId, ctx.servicios.urlBase),
  );
}
