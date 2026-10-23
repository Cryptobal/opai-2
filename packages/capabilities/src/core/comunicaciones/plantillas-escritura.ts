import { z } from "zod";

import { ejemplosDe, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { correoDe } from "../../integraciones/adaptadores";
import { enviarCorreo } from "./envio";
import { eventoComunicable, validarTextos, vistaPrevia } from "./plantillas";
import { plantillaVigente } from "./resolver";

const canalSchema = z.enum(["correo", "inapp"]);
const textos = {
  asunto: z.string().trim().min(1).max(200),
  cuerpo: z.string().trim().min(1).max(5000),
};

export const plantillasUpdate = defineCapability({
  id: "core.plantillas.update",
  descripcion:
    "Publica una nueva versión de la plantilla de un evento y canal (solo variables declaradas, {{ruta.variable}}). restablecer: true vuelve a la de OPAI.",
  permiso: PERMISOS_CORE.comunicacionesManage,
  input: z.object({
    evento: z.string(),
    canal: canalSchema,
    ...textos,
    restablecer: z.boolean().default(false),
  }),
  output: z.object({ version: z.number().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const e = eventoComunicable(input.evento);
    if (!e.plantillas[input.canal])
      throw reglaDeNegocio(`${e.nombre} no se envía por ${input.canal}.`);
    if (!input.restablecer) validarTextos(e, input.asunto, input.cuerpo);
    const ultima = await ctx.db.plantilla.findFirst({
      where: { evento: e.evento, canal: input.canal },
      orderBy: { version: "desc" },
    });
    const version = input.restablecer ? null : (ultima?.version ?? 0) + 1;
    if (dryRun) return { version };
    await ctx.transaccion(async (tx) => {
      await tx.plantilla.updateMany({
        where: { evento: e.evento, canal: input.canal, activa: true },
        data: { activa: false },
      });
      if (version !== null) {
        await tx.plantilla.create({
          data: {
            tenantId: ctx.tenantId,
            evento: e.evento,
            canal: input.canal,
            version,
            asunto: input.asunto,
            cuerpo: input.cuerpo,
            activa: true,
            creadoPor: ctx.usuario?.id ?? null,
          },
        });
      }
      await ctx.eventos.emitir(tx, {
        tipo: "core.plantilla.actualizada",
        entidadTipo: "plantilla",
        payload: { evento: e.evento, canal: input.canal, version },
      });
    });
    return { version };
  },
});

export const plantillasPreview = defineCapability({
  id: "core.plantillas.preview",
  descripcion:
    "Vista previa de una plantilla (la vigente o el texto enviado) con datos de ejemplo y la marca de la empresa: asunto, texto y HTML.",
  permiso: PERMISOS_CORE.comunicacionesManage,
  input: z.object({
    evento: z.string(),
    canal: canalSchema,
    asunto: textos.asunto.optional(),
    cuerpo: textos.cuerpo.optional(),
  }),
  output: z.object({ asunto: z.string(), texto: z.string(), html: z.string() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const vigente = await plantillaVigente(ctx.db, eventoComunicable(input.evento), input.canal);
    return vistaPrevia(
      ctx,
      input.evento,
      input.asunto ?? vigente?.asunto ?? "",
      input.cuerpo ?? vigente?.cuerpo ?? "",
    );
  },
});

export const plantillasEnviarPrueba = defineCapability({
  id: "core.plantillas.enviar_prueba",
  descripcion:
    "Envía al correo de quien la pide una prueba de la plantilla vigente de correo del evento, con datos de ejemplo. Queda en el registro de envíos.",
  permiso: PERMISOS_CORE.comunicacionesManage,
  input: z.object({ evento: z.string() }),
  output: z.object({ enviado: z.boolean(), para: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const e = eventoComunicable(input.evento);
    const para = ctx.usuario?.email;
    if (!para) throw reglaDeNegocio("La prueba se envía al correo de un usuario con sesión.");
    if (dryRun) return { enviado: false, para };
    const enviado = await enviarCorreo(
      {
        db: ctx.db,
        tenantId: ctx.tenantId,
        correo: await correoDe(ctx),
        urlBase: ctx.servicios.urlBase,
      },
      e.evento,
      para,
      ejemplosDe(e),
    );
    return { enviado, para };
  },
});
