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
import { instanteDeCorte, programarCorte } from "./vinculos-corte-programado";
import { zonaDelTenant } from "../turnos/comun";

/** «Se cortará el acceso al cierre del dd-mm» para un término futuro (CAR-385). */
const avisoCorte = (termino: string) =>
  `Se cortará el acceso al cierre del ${termino.slice(8, 10)}-${termino.slice(5, 7)}.`;

export const vinculosTerminar = defineCapability({
  id: "core.vinculos.terminar",
  descripcion:
    "IRREVERSIBLE: termina un vínculo laboral con fecha de término y motivo. Si no le quedan vínculos vigentes, la persona pasa a inactiva (su PIN de terreno deja de servir) y su usuario queda suspendido en la empresa (salvo owner): en el acto si el término es hoy o pasado, o al cierre del día de término si es futuro (`corteProgramado` lo avisa). La salida informa qué se corta.",
  permiso: PERMISOS_CORE.vinculosManage,
  input: z.object({
    id: uuidSchema,
    termino: diaSchema,
    motivo: z.string().trim().min(5).max(500),
  }),
  output: vinculoSchema.extend({ accesos: corteAccesoSchema, corteProgramado: z.string().nullable() }),
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
    // Término futuro: el acceso sigue hasta el cierre de ese día y lo corta un trabajo programado (CAR-385).
    const cuando = instanteDeCorte(input.termino, await zonaDelTenant(ctx));
    const corteProgramado = cuando ? avisoCorte(input.termino) : null;
    if (dryRun) {
      const accesos = await cortarAccesos(ctx.db, v, quien, false);
      return { ...vistaVinculo({ ...v, ...data }), accesos, corteProgramado };
    }
    let accesos: CorteAcceso | null = null;
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.vinculo.terminado",
        entidadTipo: "vinculo",
        payload: () => ({ personaId: v.personaId, termino: input.termino, accesos, corteProgramado }),
      },
      async (tx) => {
        const t = await tx.vinculoLaboral.update({ where: { id: v.id }, data });
        accesos = await cortarAccesos(tx, v, quien, !cuando);
        if (cuando && accesos.personaInactiva) await programarCorte(ctx, tx, v.id, quien, cuando);
        return t;
      },
    );
    if (!accesos) throw new Error("El corte de accesos no se registró.");
    return { ...vistaVinculo(r), accesos, corteProgramado };
  },
});
