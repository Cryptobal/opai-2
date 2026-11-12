// Slack F4 (CAR-294, ADR-093 §1): tomar, cerrar y pedir refuerzo de un aviso de terreno. OPAI es la
// fuente de verdad: los botones de Slack ejecutan estas capacidades como el usuario vinculado, con sus
// permisos y su alcance por instalación (ADR-022), y quedan en la auditoría. El mensaje de Slack se
// actualiza después, en cola.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../../define";
import { reglaDeNegocio } from "../../../errores";
import { avisoEnAlcance, cambiar, vista, vistaSchema } from "./gestion-comun";
import { TIPO_REFUERZO_AVISO } from "./registrar";

const entrada = z.object({ avisoId: z.uuid() });
const base = {
  permiso: PERMISOS_CORE.avisosTerrenoGestionar,
  portales: ["erp", "supervisor"] as ("erp" | "supervisor")[], // Botones de Slack de ERP y supervisores.
  input: entrada,
  output: vistaSchema,
  efecto: "escritura" as const,
  dryRun: true,
};

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
      {
        data: { gestion: "tomado", tomadoPor: yo, tomadoEn: new Date() },
        desde: ["abierto"],
        evento: "core.aviso_terreno.tomado",
      },
      (f) => {
        if (f.gestion === "tomado" && f.tomadoPor === yo) return vista(f);
        throw reglaDeNegocio(
          f.gestion === "cerrado" ? "El aviso ya está cerrado." : "Otra persona ya tomó este aviso.",
        );
      },
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
        data: {
          gestion: "cerrado",
          cerradoPor: yo,
          cerradoEn: new Date(),
          ...(a.tomadoPor ? {} : { tomadoPor: yo, tomadoEn: new Date() }),
        },
        desde: ["abierto", "tomado"],
        evento: "core.aviso_terreno.cerrado",
      },
      vista,
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
    return cambiar(
      ctx,
      a,
      {
        data: { updatedAt: new Date() },
        desde: ["abierto", "tomado"],
        evento: "core.aviso_terreno.refuerzo_pedido",
        extra: TIPO_REFUERZO_AVISO,
      },
      () => {
        throw reglaDeNegocio("El aviso ya está cerrado.");
      },
    );
  },
});
