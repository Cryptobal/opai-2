import { uuidSchema } from "../esquemas";
import { z } from "zod";
import { PERMISOS_CORE } from "@opai/domain";
import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { aFecha, diaSchema, escribirConEvento } from "./comun";
import { vinculoSchema, vistaVinculo } from "./vinculos-vista";
import { vinculoDe } from "./vinculos";
import { bloquearVinculo, exigirEdicionVinculo } from "./vinculos-validacion";
import { type CorteAcceso, corteAccesoSchema, cortarAccesos } from "./vinculos-corte";

export const vinculosTerminar = defineCapability({
  id: "core.vinculos.terminar",
  descripcion:
    "IRREVERSIBLE: termina un vínculo laboral con fecha de término y motivo. Si no le quedan vínculos vigentes, en el mismo acto la persona pasa a inactiva (su PIN de terreno deja de servir) y su usuario queda suspendido en la empresa (salvo owner); la salida informa qué se cortó.",
  permiso: PERMISOS_CORE.vinculosManage,
  input: z.object({
    id: uuidSchema,
    termino: diaSchema,
    motivo: z.string().trim().min(5).max(500),
  }),
  output: vinculoSchema.extend({ accesos: corteAccesoSchema }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigirEdicionVinculo(ctx);
    if (!dryRun) await bloquearVinculo(ctx, input.id);
    const v = await vinculoDe(ctx, input.id);
    if (v.estado !== "vigente") throw reglaDeNegocio("El vínculo ya está terminado.");
    const termino = aFecha(input.termino);
    if (termino < v.inicio) throw reglaDeNegocio("El término es anterior al inicio del vínculo.");
    const data = { termino, motivoTermino: input.motivo, estado: "terminado" };
    const quien = {
      tenantId: ctx.tenantId,
      gestionaUsuarios: ctx.autorizar(PERMISOS_CORE.usersManage),
      usuarioId: ctx.usuario?.id ?? null,
    };
    if (dryRun) return { ...vistaVinculo({ ...v, ...data }), accesos: await cortarAccesos(ctx.db, v, quien, false) };
    let accesos: CorteAcceso | null = null;
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.vinculo.terminado",
        entidadTipo: "vinculo",
        payload: () => ({ personaId: v.personaId, termino: input.termino, accesos }),
      },
      async (tx) => {
        const t = await tx.vinculoLaboral.update({ where: { id: v.id }, data });
        accesos = await cortarAccesos(tx, v, quien, true);
        return t;
      },
    );
    if (!accesos) throw new Error("El corte de accesos no se registró.");
    return { ...vistaVinculo(r), accesos };
  },
});
