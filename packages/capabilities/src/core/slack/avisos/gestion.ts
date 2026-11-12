// Slack F4 (CAR-294, ADR-093 §1): tomar, cerrar y pedir refuerzo de un aviso de terreno. OPAI es la
// fuente de verdad: los botones de Slack ejecutan estas capacidades como el usuario vinculado, con sus
// permisos y su alcance por instalación (ADR-022), y quedan en la auditoría. El mensaje de Slack se
// actualiza después, en cola.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../../define";
import { noEncontrado, reglaDeNegocio } from "../../../errores";
import type { Contexto } from "../../../types";
import { iso } from "../../comun";
import { TIPO_ACTUALIZAR_AVISO, TIPO_REFUERZO_AVISO } from "./registrar";

const vistaSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  titulo: z.string(),
  gestion: z.enum(["abierto", "tomado", "cerrado"]),
  tomadoPor: z.string().nullable(),
  tomadoEn: z.string().nullable(),
  cerradoEn: z.string().nullable(),
});

type Fila = NonNullable<Awaited<ReturnType<Contexto["db"]["slackAviso"]["findUnique"]>>>;
const vista = (a: Fila) => ({
  id: a.id,
  tipo: a.tipo,
  titulo: a.titulo,
  gestion: a.gestion as "abierto" | "tomado" | "cerrado",
  tomadoPor: a.tomadoPor,
  tomadoEn: iso(a.tomadoEn),
  cerradoEn: iso(a.cerradoEn),
});

/** Aviso dentro del alcance del actor: un supervisor solo ve los de sus instalaciones (ADR-022). */
async function avisoEnAlcance(ctx: Contexto, id: string) {
  const a = await ctx.db.slackAviso.findUnique({ where: { id } });
  const fuera =
    a && ctx.alcance && (!a.instalacionId || !ctx.alcance.instalaciones.includes(a.instalacionId));
  if (!a || fuera) throw noEncontrado("El aviso");
  return a;
}

const entrada = z.object({ avisoId: z.uuid() });
const base = {
  permiso: PERMISOS_CORE.avisosTerrenoGestionar,
  input: entrada,
  output: vistaSchema,
  efecto: "escritura" as const,
  dryRun: true,
};

/** Cambia la gestión en una transacción, con evento y la actualización del mensaje de Slack en cola. */
async function cambiar(
  ctx: Contexto,
  a: Fila,
  data: Record<string, unknown>,
  evento: string,
  extra?: string,
) {
  return ctx.transaccion(async (tx) => {
    const nuevo = await tx.slackAviso.update({ where: { id: a.id }, data });
    await ctx.eventos.emitir(tx, {
      tipo: evento,
      entidadTipo: "aviso_terreno",
      entidadId: a.id,
      payload: { avisoId: a.id },
    });
    if (a.ts)
      await ctx.trabajos.encolar(tx, {
        tipo: TIPO_ACTUALIZAR_AVISO,
        payload: { avisoId: a.id },
        claveUnica: `slack-aviso-actualizar:${a.id}:${evento}`,
        maxIntentos: 5,
      });
    if (extra)
      await ctx.trabajos.encolar(tx, {
        tipo: extra,
        payload: { avisoId: a.id, porUserId: ctx.usuario?.id ?? null },
        claveUnica: `${extra}:${a.id}:${Date.now()}`,
        maxIntentos: 4,
      });
    return vista(nuevo);
  });
}

export const avisosTerrenoTomar = defineCapability({
  ...base,
  id: "core.avisos_terreno.tomar",
  descripcion:
    "Toma un aviso de terreno (anomalía, incidente o pánico): queda a tu cargo, se ve en OPAI y el mensaje de Slack muestra quién lo tomó. Si ya lo tomó otra persona, no cambia nada.",
  async handler(ctx, input, { dryRun }) {
    const a = await avisoEnAlcance(ctx, input.avisoId);
    const yo = ctx.usuario?.id ?? null;
    if (a.gestion === "cerrado") throw reglaDeNegocio("El aviso ya está cerrado.");
    if (a.gestion === "tomado") {
      if (a.tomadoPor === yo) return vista(a);
      throw reglaDeNegocio("Otra persona ya tomó este aviso.");
    }
    if (dryRun) return { ...vista(a), gestion: "tomado" as const, tomadoPor: yo };
    return cambiar(
      ctx,
      a,
      { gestion: "tomado", tomadoPor: yo, tomadoEn: new Date() },
      "core.aviso_terreno.tomado",
    );
  },
});

export const avisosTerrenoCerrar = defineCapability({
  ...base,
  id: "core.avisos_terreno.cerrar",
  descripcion:
    "Cierra un aviso de terreno ya atendido: deja de estar pendiente en OPAI y el mensaje de Slack muestra quién lo cerró.",
  async handler(ctx, input, { dryRun }) {
    const a = await avisoEnAlcance(ctx, input.avisoId);
    if (a.gestion === "cerrado") return vista(a);
    const yo = ctx.usuario?.id ?? null;
    if (dryRun) return { ...vista(a), gestion: "cerrado" as const };
    return cambiar(
      ctx,
      a,
      {
        gestion: "cerrado",
        cerradoPor: yo,
        cerradoEn: new Date(),
        ...(a.tomadoPor ? {} : { tomadoPor: yo, tomadoEn: new Date() }),
      },
      "core.aviso_terreno.cerrado",
    );
  },
});

export const avisosTerrenoPedirRefuerzo = defineCapability({
  ...base,
  id: "core.avisos_terreno.pedir_refuerzo",
  descripcion:
    "Pide refuerzo para un aviso de terreno abierto o tomado: lo anota en el hilo de Slack y avisa por mensaje directo al grupo de escalamiento que eligió la empresa.",
  async handler(ctx, input, { dryRun }) {
    const a = await avisoEnAlcance(ctx, input.avisoId);
    if (a.gestion === "cerrado") throw reglaDeNegocio("El aviso ya está cerrado.");
    if (dryRun) return vista(a);
    return cambiar(ctx, a, {}, "core.aviso_terreno.refuerzo_pedido", TIPO_REFUERZO_AVISO);
  },
});
